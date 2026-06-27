import { db } from '../db/index';
import { eq, lt, sql, and } from 'drizzle-orm';
import { users, sessionTable, verifyEmailTable, passwordResetTokenTable, departments, workspaceMembers, workspaces } from "./schema";
import type { newVerify, newSession, NewUser } from "./schema";
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

import { randomInt } from 'crypto';

import { sendMail } from '../lib/send-email';

import { verifyEmailTemplate } from '../emails/verifyEmailTemplate';
import { passwordResetTemplate } from '../emails/passwordResetTemplate';

//import { sendMail } from '../lib/nodemailer';

//user queri

export const createUser = async (data: NewUser) => {
    // Check if this is the first user in the database to bootstrap as admin
    const allUsers = await db.select().from(users).limit(1);
    const isFirstUser = allUsers.length === 0;

    const existingUser = await db.select()
        .from(users)
        .where(eq(users.email, data.email));

    if (existingUser.length > 0) {
        throw new Error('User with this email already exists');
    }

    const insertData = { ...data };
    if (isFirstUser) {
        insertData.role = 'super_admin';
        insertData.isEmailVerified = true;
    }

    const [user] = (await db.insert(users).values(insertData).returning()) as any[];

    let emailResult = null;
    if (!isFirstUser) {
        emailResult = await sendNewVerificationEmail(user.id, user.email);
    }

    return { user, emailResult };
}


export const getUserByEmail = async (email: string) => {
    const [user] = await db.select()
        .from(users)
        .where(eq(users.email, email));


    return user;
}


// session queries
export const createSession = async (data: newSession) => {
    const session = await db.insert(sessionTable)
        .values({ ...data }).returning({ id: sessionTable.id });
    return session;
}

// Create Access Token - accepts arbitrary payload (user info/session)
export const createAccessToken = (payload: Record<string, unknown>) => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

// Create Refresh Token - accepts arbitrary payload
export const refressAccessToken = (payload: Record<string, unknown>) => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15d' });
}

export const findSessionById = async (id: number) => {
    const [session] = await db.select()
        .from(sessionTable)
        .where(eq(sessionTable.id, id));
    return session;
}

//find user by id
export const findUserById = async (id: number) => {
    const [user] = await db.select()
        .from(users)
        .where(eq(users.id, id));
    return user;
}

// Refress Token
export const refressTokens = async (token: string) => {

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const currentSession = await findSessionById((decoded as any).sessionId);

        if (!currentSession || !currentSession.valid) {
            throw new Error('Invalid session');
        }

        const user = await findUserById((currentSession as any).userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Look up active workspace membership so the refreshed token retains workspace context
        const memberships = await db.select({
            workspaceId: workspaceMembers.workspaceId,
            role: workspaceMembers.role,
            status: workspaceMembers.status,
            workspaceName: workspaces.name,
            workspaceSlug: workspaces.slug
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, user.id));

        const activeMembership = memberships.find(m => m.status === 'active');

        const userInfo = {
            id: user.id,
            name: user.name,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            role: user.role === 'super_admin' ? 'super_admin' : (activeMembership?.role || user.role),
            activeWorkspaceId: activeMembership?.workspaceId || null,
            workspaceName: activeMembership?.workspaceName || '',
            workspaceSlug: activeMembership?.workspaceSlug || '',
            position: user.position,
            phone: user.phone,
            departmentId: user.departmentId,
            is2faEnabled: user.is2faEnabled,
            sessionId: currentSession.id
        }

        const newAccessToken = createAccessToken(userInfo);
        const newRefreshToken = refressAccessToken({ sessionId: currentSession.id });

        return {
            newAccessToken,
            newRefreshToken,
            user: userInfo
        }

    } catch (error) {
        console.error('Error in refressTokens:', error);
    }

}

//Clear session

export const clearUserSession = async (sessionId: number) => {
    return db.delete(sessionTable)
        .where(eq(sessionTable.id, sessionId));
}

//generate random token 
export const generateRandomToken = (digit: number) => {
    const min = 10 ** (digit - 1); // 10000000 7 digits
    const max = 10 ** digit;   // 100000000 8 digits

    return randomInt(min, max).toString();
}

//insert into verify email table
export const insertVerifyEmailToken = async (data: newVerify) => {

    return db.transaction(async (tx) => {
        try {
            await tx.delete(verifyEmailTable)
                .where(lt(verifyEmailTable.expiresAt, sql`CURRENT_TIMESTAMP`));

            await tx.delete(verifyEmailTable)
                .where(eq(verifyEmailTable.userId, data.userId));

            const [inserted] = await tx.insert(verifyEmailTable)
                .values({ ...data })
                .returning();
            return inserted;
        } catch (err) {
            console.error('Error inserting verify email token:', err);
            throw err;
        }
    })

}


export const getVerifyByEmailLink = async (
    { email, token }: { email: string; token: string }
) => {

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const url = new URL(`${backendUrl}/api/users/verify-email-link`);
    url.searchParams.append('token', token);
    url.searchParams.append('email', email);

    return url.toString();


};

// Find a verify token row by token and userId
export const findVerifyToken = async ({ token, userId }: { token: string; userId: number }) => {
    const [row] = await db.select()
        .from(verifyEmailTable)
        .where(and(eq(verifyEmailTable.token, token), eq(verifyEmailTable.userId, userId)));
    return row;
}

// Confirm email verification for a user: set flag and cleanup tokens
export const confirmEmailVerification = async (userId: number) => {
    // mark user as verified
    await db.update(users)
        .set({ isEmailVerified: true })
        .where(eq(users.id, userId));

    // remove any existing verification tokens for the user
    await db.delete(verifyEmailTable)
        .where(eq(verifyEmailTable.userId, userId));

    const updated = await db.select().from(users).where(eq(users.id, userId));
    return updated[0];
}

export const sendNewVerificationEmail = async (
    userId: number,
    email: string
) => {
    const randomToken = generateRandomToken(8);

    await insertVerifyEmailToken({
        userId,
        token: randomToken,
    });

    const verifyEmailLink = await getVerifyByEmailLink({
        email,
        token: randomToken,
    });


    try {
        const html = verifyEmailTemplate({ verifyEmailLink, token: randomToken });
        const result = await sendMail(email, 'Verify your email address', html);

        if (!result.success) {
            throw new Error('Email send failed');
        }

        return {
            success: true,
            message: 'Verification token created',
            previewUrl: result?.previewUrl,
        };
    } catch (err: any) {
        console.error('Error sending verification email:', err);

        // token already saved — surface failure details
        return {
            success: false,
            tokenCreated: true,
            emailSent: false,
            message: 'Verification token created (email send failed)',
            error: (err as any)?.response?.data ?? String(err),
        };
    }
};

export const updateUserName = async (userId: number, name: string) => {
    const [updated] = await db.update(users)
        .set({ name })
        .where(eq(users.id, userId))
        .returning();
    return updated;
}

export const updateUserAvatar = async (userId: number, avatarUrl: string | null) => {
    const [updated] = await db.update(users)
        .set({ avatarUrl })
        .where(eq(users.id, userId))
        .returning();
    return updated;
}


export const updateUserPassword = async (userId: number, hashedPassword: string) => {

    const [updated] = await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();
    return updated;
}

export const insertPasswordResetToken = async (userId: number, token: string) => {
    return db.transaction(async (tx) => {
        try {
            // Remove expired tokens
            await tx.delete(passwordResetTokenTable)
                .where(lt(passwordResetTokenTable.expiresAt, sql`CURRENT_TIMESTAMP`));

            // Remove any existing token for this user
            await tx.delete(passwordResetTokenTable)
                .where(eq(passwordResetTokenTable.userId, userId));

            const [inserted] = await tx.insert(passwordResetTokenTable)
                .values({ userId, token })
                .returning();
            return inserted;
        } catch (err) {
            console.error('Error inserting password reset token:', err);
            throw err;
        }
    });
}

export const findPasswordResetToken = async ({ token, userId }: { token: string; userId: number }) => {
    const [row] = await db.select()
        .from(passwordResetTokenTable)
        .where(and(eq(passwordResetTokenTable.token, token), eq(passwordResetTokenTable.userId, userId)));
    return row;
}

export const deletePasswordResetTokensForUser = async (userId: number) => {
    return db.delete(passwordResetTokenTable).where(eq(passwordResetTokenTable.userId, userId));
}

export const sendPasswordResetEmail = async (userId: number, email: string) => {
    const randomToken = generateRandomToken(8);

    // persist token with cleanup
    await insertPasswordResetToken(userId, randomToken);

    const resetUrl = new URL(`${env.FRONTEND_URL}/reset-password`);
    resetUrl.searchParams.append('token', randomToken);
    resetUrl.searchParams.append('email', email);

    const html = passwordResetTemplate({
        resetUrl: resetUrl.toString(),
        token: randomToken,
    });

    try {
        const result = await sendMail(email, 'Reset your password', html);
        return {
            success: true,
            message: 'Password reset token created',
            previewUrl: result?.previewUrl,
        };
    } catch (err: any) {
        console.error('Error sending password reset email:', err);
        return {
            success: false,
            tokenCreated: true,
            emailSent: false,
            message: 'Password reset token created (email send failed)',
            error: (err as any)?.response?.data ?? String(err),
        };
    }
}

export const updateUserProfile = async (
    userId: number,
    data: { name: string; position: string | null; phone: string | null; departmentId: number | null }
) => {
    const [updated] = await db.update(users)
        .set({
            name: data.name,
            position: data.position,
            phone: data.phone,
            departmentId: data.departmentId,
            updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
    return updated;
};

export const toggle2Fa = async (userId: number, isEnabled: boolean) => {
    const [updated] = await db.update(users)
        .set({ is2faEnabled: isEnabled, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
    return updated;
};

export const save2FaOtp = async (userId: number, otpCode: string | null, expiresAt: Date | null) => {
    const [updated] = await db.update(users)
        .set({ otpCode, otpExpiresAt: expiresAt, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
    return updated;
};

export const saveEmailVerificationToken = async (userId: number, token: string, expiresAt: Date) => {
    await db.delete(verifyEmailTable).where(eq(verifyEmailTable.userId, userId));
    const [inserted] = await db.insert(verifyEmailTable).values({
        userId,
        token,
        expiresAt
    }).returning();
    return inserted;
};

export const getDepartmentsList = async () => {
    return db.select().from(departments);
};


