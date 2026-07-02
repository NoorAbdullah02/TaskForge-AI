import type { Request, Response } from 'express'
import * as queries from "../db/queries"
import { imagekit } from '../lib/imagekit';
import { sendMail } from '../lib/send-email';
import { otpTemplate } from '../emails/otpTemplate';
import { db } from '../db/index';
import { workspaceMembers, workspaces, users, sessionTable, apiKeys, activityLogs } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';


import { RegisterCheckValid, validatePasswordStrength } from '../validations/validinputs'

import { LoginValidationSchema } from '../validations/validinputs'

import { env } from '../config/env';

import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';



export const registerUser = async (req: Request, res: Response) => {
    try {

        const validationResult = await RegisterCheckValid.safeParseAsync(req.body);

        if (!validationResult.success) {
            return res.status(400).json({ message: "Invalid input", errors: validationResult.error.issues });
        }

        const { name, email, password } = validationResult.data;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await queries.createUser({
            name,
            email,
            password: hashedPassword
        })

        if (user.emailResult?.success) {
            return res.status(201).json({
                message: 'User created & verification email sent',
                previewUrl: user.emailResult.previewUrl,
            });
        }

        return res.status(201).json({
            message: 'User created but email failed',
            error: user.emailResult?.error,
        });

    } catch (error: any) {
        console.error("Error in registerUser:", error);
        if (error?.message?.includes('already exists')) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }

}

export const loginUser = async (req: Request, res: Response) => {
    try {
        console.log('loginUser body:', req.body);
        const validationResult = await LoginValidationSchema.safeParseAsync(req.body);
        if (!validationResult.success) {
            console.warn('login validation failed:', validationResult.error.issues);
            return res.status(400).json({ message: "Invalid input", errors: validationResult.error.issues });
        }
        const { email, password } = validationResult.data;

        const check = await queries.getUserByEmail(email);

        if (!check) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (check.role === 'banned') {
            return res.status(403).json({ message: "Your account has been banned by platform administrators." });
        }

        const isPasswordValid = await bcrypt.compare(password, check.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (!check.isEmailVerified) {
            return res.status(403).json({ message: "Email is not verified Check Your Email Please!" });
        }

        if (check.is2faEnabled) {
            const otp = queries.generateRandomToken(6);
            const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
            await queries.save2FaOtp(check.id, otp, expires);

            try {
                const html = otpTemplate({ token: otp });
                await sendMail(check.email, 'Your 2FA Verification Code', html);
            } catch (err) {
                console.error('Failed to send OTP email:', err);
            }

            return res.status(200).json({ message: "2FA_REQUIRED", email: check.email });
        }

        // Check workspace memberships
        const userMemberships = await db.select({
            workspaceId: workspaceMembers.workspaceId,
            role: workspaceMembers.role,
            status: workspaceMembers.status,
            workspaceStatus: workspaces.status,
            workspaceName: workspaces.name,
            workspaceSlug: workspaces.slug
        })
            .from(workspaceMembers)
            .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
            .where(eq(workspaceMembers.userId, check.id));

        if (check.role !== 'super_admin' && userMemberships.length === 0) {
            return res.status(403).json({ message: "You are not a member of any workspace." });
        }

        // Find an active membership
        const activeMembership = userMemberships.find(m => m.status === 'active');
        if (check.role !== 'super_admin' && !activeMembership) {
            const hasPending = userMemberships.some(m => m.status === 'pending');
            if (hasPending) {
                return res.status(403).json({ message: "Your request to join the workspace is pending approval." });
            }
            return res.status(403).json({ message: "Your account is not active in any workspace." });
        }

        // Check suspended
        if (check.role !== 'super_admin' && activeMembership && activeMembership.workspaceStatus === 'suspended') {
            return res.status(403).json({ message: "This workspace has been suspended by system administrators." });
        }

        const currentWorkspace = activeMembership || { workspaceId: null, role: check.role, workspaceName: '', workspaceSlug: '' };

        // create a session record for the logged-in user

        const sessionPayload = {
            userId: check.id,
            ip: (req as any).clientIp || req.ip || req.headers['x-forwarded-for'] || null,
            userAgent: req.get('User-Agent') || null,
        };
        console.log('Creating session with payload:', sessionPayload);
        const session = await queries.createSession(sessionPayload as any);
        const sessionId = session[0]?.id;

        const accessToken = queries.createAccessToken({
            id: check.id,
            name: check.name,
            email: check.email,
            isEmailVerified: check.isEmailVerified,
            role: check.role === 'super_admin' ? 'super_admin' : currentWorkspace.role,
            activeWorkspaceId: currentWorkspace.workspaceId,
            workspaceName: currentWorkspace.workspaceName,
            workspaceSlug: currentWorkspace.workspaceSlug,
            position: check.position,
            phone: check.phone,
            departmentId: check.departmentId,
            is2faEnabled: check.is2faEnabled,
            sessionId
        });
        const refreshToken = queries.refressAccessToken({ sessionId });

        const baseConfig = {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
        }

        res.cookie('accessToken', accessToken, {
            ...baseConfig,
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            ...baseConfig,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });


        return res.status(200).json({ message: "Login successful", accessToken, sessionId });

    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


export const checkEmailExists = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        const user = await queries.getUserByEmail(email);

        if (user) {
            return res.status(200).json({ exists: true });
        } else {
            return res.status(200).json({ exists: false });
        }
    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        const decodedUser = (req as any).user;

        if (!decodedUser) {
            return res.status(200).json({
                authenticated: false,
                user: null,
                message: "Not authenticated"
            });
        }

        const user = await queries.findUserById(decodedUser.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let activeWorkspaceId = decodedUser?.activeWorkspaceId;
        let workspaceName = decodedUser?.workspaceName;
        let workspaceSlug = decodedUser?.workspaceSlug;

        // Fallback in case they are not in the decoded token (e.g. initial login, direct page boots)
        if (!activeWorkspaceId) {
            const [firstMembership] = await db.select({
                workspaceId: workspaceMembers.workspaceId,
                workspaceName: workspaces.name,
                workspaceSlug: workspaces.slug
            })
                .from(workspaceMembers)
                .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
                .where(and(
                    eq(workspaceMembers.userId, user.id),
                    eq(workspaceMembers.status, 'active')
                ))
                .limit(1);

            if (firstMembership) {
                activeWorkspaceId = firstMembership.workspaceId;
                workspaceName = firstMembership.workspaceName;
                workspaceSlug = firstMembership.workspaceSlug;
            }
        }

        const { password, ...safeUser } = user;
        return res.status(200).json({
            user: {
                ...safeUser,
                activeWorkspaceId,
                workspaceName,
                workspaceSlug
            }
        });
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


export const logoutUser = async (req: Request, res: Response) => {
    try {
        let sessionId = (req as any).sessionId;

        const accessToken = req.cookies?.accessToken;
        const refreshToken = req.cookies?.refreshToken;

        // Try to decode access token if we still don't have a sessionId
        if (!sessionId && accessToken) {
            try {
                const decoded = jwt.verify(accessToken, env.JWT_SECRET) as any;
                sessionId = decoded?.sessionId;
            } catch (e) {
                // invalid access token — ignore and try refresh token
            }
        }

        // Try to decode refresh token if needed
        if (!sessionId && refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as any;
                sessionId = decoded?.sessionId;
            } catch (e) {
                // invalid refresh token — nothing more to do
            }
        }

        if (sessionId) {
            await queries.clearUserSession(sessionId);
        } else {
            console.warn('logoutUser: no sessionId found; nothing to clear');
        }

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error('Error in logoutUser:', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


export const userProfile = async (req: Request, res: Response) => {

    if (!(req as any).user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    const user = await queries.findUserById((req as any).user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: (user as any).avatarUrl || null,
        role: user.role,
        position: user.position,
        phone: user.phone,
        departmentId: user.departmentId,
        is2faEnabled: user.is2faEnabled,
        createdAt: user.createdAt,
    });

}


export const verify_email = async (req: Request, res: Response) => {
    if ((req as any).user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
    }
    if ((!req as any).user) {
        return (req as any).status(401).json({
            message: "Unauthorized"
        });
    }

    const user = await queries.findUserById((req as any).user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
        email: (req as any).user.email
    });
}


export const send_verification_email = async (req: Request, res: Response) => {

    if (!(req as any).user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = (req as any).user.id;
    const user = await queries.findUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified) {
        if ((req as any).user.isEmailVerified !== user.isEmailVerified) {
            console.warn(`Mismatch: token.isEmailVerified=${(req as any).user.isEmailVerified} but db.isEmailVerified=${user.isEmailVerified}`);
        }
        return res.status(400).json({ message: "Email is already verified" });
    }


    try {
        const result = await queries.sendNewVerificationEmail(userId, user.email);
        if (result?.success) {
            return res.status(200).json({ message: 'Verification token created', previewUrl: result.previewUrl });
        } else {
            // token saved but sending failed or other non-fatal issue
            return res.status(200).json({ message: 'Verification token created (email send failed)', previewUrl: result?.previewUrl, error: result?.error });
        }
    } catch (err) {
        console.error('Error in send_verification_email:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }

}

export const resendVerificationByEmail = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await queries.getUserByEmail(email);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.isEmailVerified) return res.status(400).json({ message: 'Email is already verified' });

        const result = await queries.sendNewVerificationEmail(user.id, user.email);
        if (result?.success) {
            return res.status(200).json({ message: 'Verification token created', previewUrl: result.previewUrl });
        } else {
            return res.status(200).json({ message: 'Verification token created (email send failed)', previewUrl: result?.previewUrl, error: result?.error });
        }
    } catch (err) {
        console.error('Error in resendVerificationByEmail:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export const resetUserPassword = async (req: Request, res: Response) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ message: 'Email, token and new password are required' });
        }

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const user = await queries.getUserByEmail(email);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const tokenRow = await queries.findPasswordResetToken({ token, userId: user.id });
        if (!tokenRow) return res.status(400).json({ message: 'Invalid or expired token' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await queries.updateUserPassword(user.id, hashed);
        await queries.deletePasswordResetTokensForUser(user.id);

        return res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('Error in resetUserPassword:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export const verifyEmailToken = async (req: Request, res: Response) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({ message: 'Email and token are required' });
        }

        const user = await queries.getUserByEmail(email);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const verifyRow = await queries.findVerifyToken({ token, userId: user.id });
        if (!verifyRow) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Token exists and belongs to the user — confirm verification
        const updatedUser = await queries.confirmEmailVerification(user.id);

        return res.status(200).json({ message: 'Email verified successfully', user: { id: updatedUser.id, email: updatedUser.email, isEmailVerified: updatedUser.isEmailVerified } });
    } catch (err) {
        console.error('Error in verifyEmailToken:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

// Auto-verify email via link click (GET request from email button)
export const verifyEmailViaLink = async (req: Request, res: Response) => {
    try {
        const { email, token } = req.query;

        if (!email || !token) {
            return res.redirect(`${env.FRONTEND_URL}/verify-email-result?status=error&message=${encodeURIComponent('Invalid verification link. Missing email or token.')}`);
        }

        const user = await queries.getUserByEmail(email as string);
        if (!user) {
            return res.redirect(`${env.FRONTEND_URL}/verify-email-result?status=error&message=${encodeURIComponent('User not found.')}`);
        }

        if (user.isEmailVerified) {
            return res.redirect(`${env.FRONTEND_URL}/verify-email-result?status=already-verified&email=${encodeURIComponent(user.email)}`);
        }

        const verifyRow = await queries.findVerifyToken({ token: token as string, userId: user.id });
        if (!verifyRow) {
            return res.redirect(`${env.FRONTEND_URL}/verify-email-result?status=error&message=${encodeURIComponent('Invalid or expired verification link. Please request a new one.')}&email=${encodeURIComponent(user.email)}`);
        }

        // Token valid — confirm verification
        await queries.confirmEmailVerification(user.id);

        return res.redirect(`${env.FRONTEND_URL}/verify-email-result?status=success&email=${encodeURIComponent(user.email)}`);
    } catch (err) {
        console.error('Error in verifyEmailViaLink:', err);
        return res.redirect(`${env.FRONTEND_URL}/verify-email-result?status=error&message=${encodeURIComponent('Something went wrong. Please try again.')}`);
    }
}


export const editUserName = async (req: Request, res: Response) => {

    if (!(req as any).user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }
    try {
        const user = await queries.findUserById((req as any).user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: "Invalid name" });
        }

        const updatedUser = await queries.updateUserName(user.id, name.trim());
        return res.status(200).json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


export const changeUserPassword = async (req: Request, res: Response) => {
    if (!(req as any).user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }
    try {
        const user = await queries.findUserById((req as any).user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        const result = await queries.updateUserPassword(user.id, hashedNewPassword);

        return res.status(200).json({ message: "Password updated successfully" });


    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });


    }

}


export const forgotUserPassword = async (req: Request, res: Response) => {

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await queries.getUserByEmail(email);
        if (!user) return res.status(404).json({ message: "User not found" });

        const result = await queries.sendPasswordResetEmail(user.id, user.email);
        if (result?.success) {
            return res.status(200).json({ message: 'Password reset token created', previewUrl: result.previewUrl });
        } else {
            return res.status(200).json({ message: 'Password reset token created (email send failed)', previewUrl: result?.previewUrl, error: result?.error });
        }

    } catch (err) {
        console.error('Error in forgotUserPassword:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }

}

export const editUserAvatar = async (req: Request, res: Response) => {
    if (!(req as any).user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const user = await queries.findUserById((req as any).user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { avatarUrl } = req.body;
        if (avatarUrl === undefined) {
            return res.status(400).json({ message: "avatarUrl is required" });
        }

        // Delete old avatar from ImageKit if it exists
        if ((user as any).avatarUrl && (user as any).avatarUrl.includes('#')) {
            const fileId = (user as any).avatarUrl.split('#')[1];
            if (fileId) {
                try {
                    await imagekit.deleteFile(fileId);
                } catch (err) {
                    console.error('Failed to delete old avatar from ImageKit:', err);
                }
            }
        }

        const updatedUser = await queries.updateUserAvatar(user.id, avatarUrl || null);
        return res.status(200).json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatarUrl: (updatedUser as any).avatarUrl || null
        });
    } catch (error) {
        console.error('Error in editUserAvatar:', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const verify2FaUser = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP code are required" });
        }

        const user = await queries.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.otpCode || !user.otpExpiresAt || user.otpCode !== otp || new Date() > new Date(user.otpExpiresAt)) {
            return res.status(400).json({ message: "Invalid or expired verification code" });
        }

        // Clear OTP
        await queries.save2FaOtp(user.id, null, null);

        // Standard login logic (session + tokens)
        const sessionPayload = {
            userId: user.id,
            ip: (req as any).clientIp || req.ip || req.headers['x-forwarded-for'] || null,
            userAgent: req.get('User-Agent') || null,
        };
        const session = await queries.createSession(sessionPayload as any);
        const sessionId = session[0]?.id;

        // Look up active workspace membership for token context
        const userMemberships2fa = await db.select({
            workspaceId: workspaceMembers.workspaceId,
            role: workspaceMembers.role,
            status: workspaceMembers.status,
            workspaceName: workspaces.name,
            workspaceSlug: workspaces.slug
        })
            .from(workspaceMembers)
            .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
            .where(eq(workspaceMembers.userId, user.id));

        const active2faMembership = userMemberships2fa.find(m => m.status === 'active');
        const current2faWorkspace = active2faMembership || { workspaceId: null, role: user.role, workspaceName: '', workspaceSlug: '' };

        const accessToken = queries.createAccessToken({
            id: user.id,
            name: user.name,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
            role: user.role === 'super_admin' ? 'super_admin' : current2faWorkspace.role,
            activeWorkspaceId: current2faWorkspace.workspaceId,
            workspaceName: current2faWorkspace.workspaceName,
            workspaceSlug: current2faWorkspace.workspaceSlug,
            position: user.position,
            phone: user.phone,
            departmentId: user.departmentId,
            is2faEnabled: user.is2faEnabled,
            sessionId
        });
        const refreshToken = queries.refressAccessToken({ sessionId });

        const baseConfig = {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
        };

        res.cookie('accessToken', accessToken, { ...baseConfig, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...baseConfig, maxAge: 7 * 24 * 60 * 60 * 1000 });

        return res.status(200).json({ message: "Login successful", accessToken, sessionId });
    } catch (error) {
        console.error("Error in verify2FaUser:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const toggle2FaUser = async (req: Request, res: Response) => {
    if (!(req as any).user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const user = await queries.findUserById((req as any).user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { enable } = req.body;
        const updated = await queries.toggle2Fa(user.id, !!enable);

        return res.status(200).json({
            message: `2FA ${!!enable ? 'enabled' : 'disabled'} successfully`,
            is2faEnabled: updated.is2faEnabled
        });
    } catch (error) {
        console.error("Error in toggle2FaUser:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateUserProfile = async (req: Request, res: Response) => {
    if (!(req as any).user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const user = await queries.findUserById((req as any).user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { name, position, phone, departmentId } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: "Name is required" });
        }

        const updated = await queries.updateUserProfile(user.id, {
            name: name.trim(),
            position: position ? position.trim() : null,
            phone: phone ? phone.trim() : null,
            departmentId: departmentId ? parseInt(departmentId, 10) : null
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                position: updated.position,
                phone: updated.phone,
                departmentId: updated.departmentId,
                avatarUrl: (updated as any).avatarUrl || null,
                is2faEnabled: updated.is2faEnabled,
            }
        });
    } catch (error) {
        console.error("Error in updateUserProfile:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getDepartments = async (req: Request, res: Response) => {
    if (!(req as any).user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const list = await queries.getDepartmentsList();
        return res.status(200).json(list);
    } catch (error) {
        console.error("Error in getDepartments:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getSetupStatus = async (req: Request, res: Response) => {
    try {
        const allUsers = await db.select().from(users).limit(1);
        return res.status(200).json({ firstTimeSetup: allUsers.length === 0 });
    } catch (error) {
        console.error("Error in getSetupStatus:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Active Sessions Management
export const getUserSessions = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const list = await db.select()
            .from(sessionTable)
            .where(eq(sessionTable.userId, user.id))
            .orderBy(desc(sessionTable.createdAt));

        return res.status(200).json(list);
    } catch (error) {
        console.error("Error in getUserSessions:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const revokeSession = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) return res.status(400).json({ message: "Invalid session ID" });

    try {
        const [session] = await db.select()
            .from(sessionTable)
            .where(and(
                eq(sessionTable.id, sessionId),
                eq(sessionTable.userId, user.id)
            ));

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        await queries.clearUserSession(sessionId);
        return res.status(200).json({ message: "Session revoked successfully" });
    } catch (error) {
        console.error("Error in revokeSession:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Activity Logs Management
export const getUserActivityLogs = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const logs = await db.select()
            .from(activityLogs)
            .where(eq(activityLogs.userId, user.id))
            .orderBy(desc(activityLogs.createdAt))
            .limit(100);

        return res.status(200).json(logs);
    } catch (error) {
        console.error("Error in getUserActivityLogs:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// API Key Management
export const getApiKeys = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const keys = await db.select()
            .from(apiKeys)
            .where(eq(apiKeys.userId, user.id))
            .orderBy(desc(apiKeys.createdAt));

        return res.status(200).json(keys);
    } catch (error) {
        console.error("Error in getApiKeys:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const createApiKey = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { name } = req.body;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "API key name is required" });
    }

    try {
        const crypto = require('crypto');
        const rawKey = 'tf_live_' + crypto.randomBytes(24).toString('hex');

        const [newKey] = await db.insert(apiKeys).values({
            userId: user.id,
            workspaceId: user.activeWorkspaceId || null,
            name,
            key: rawKey,
            status: 'active'
        }).returning();

        return res.status(201).json(newKey);
    } catch (error) {
        console.error("Error in createApiKey:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const revokeApiKey = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const keyId = parseInt(req.params.id, 10);
    if (isNaN(keyId)) return res.status(400).json({ message: "Invalid key ID" });

    try {
        const [apiKey] = await db.select()
            .from(apiKeys)
            .where(and(
                eq(apiKeys.id, keyId),
                eq(apiKeys.userId, user.id)
            ));

        if (!apiKey) {
            return res.status(404).json({ message: "API Key not found" });
        }

        await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
        return res.status(200).json({ message: "API Key revoked successfully" });
    } catch (error) {
        console.error("Error in revokeApiKey:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};