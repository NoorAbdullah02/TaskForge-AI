import type { Request, Response } from 'express'
import * as queries from "../db/queries"

import { RegisterCheckValid } from '../validations/validinputs'

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

        const isPasswordValid = await bcrypt.compare(password, check.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (!check.isEmailVerified) {
            return res.status(403).json({ message: "Email is not verified Check Your Email Please!" });
        }


        // const token = jwt.sign({
        //     id: check.id,
        //     email: check.email
        // }, env.JWT_SECRET, { expiresIn: '7d' });
        // res.cookie('token', token, {
        //     httpOnly: true,
        //     // secure: env.NODE_ENV === 'production',
        //     sameSite: 'lax', // allow sending cookie on top-level navigations in dev
        //     maxAge: 7 * 24 * 60 * 60 * 1000
        // })

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
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Do not return sensitive fields such as password
        const { password, ...safeUser } = user;
        return res.status(200).json({ user: safeUser });
    } catch (error) {
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

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
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