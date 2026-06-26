import { Router } from "express";
import { registerUser, changeUserPassword, forgotUserPassword, resetUserPassword, loginUser, checkEmailExists, getCurrentUser, logoutUser, userProfile, verify_email, send_verification_email, verifyEmailToken, resendVerificationByEmail, editUserName, editUserAvatar, verify2FaUser, toggle2FaUser, updateUserProfile, getDepartments, verifyEmailViaLink, getSetupStatus, getUserSessions, revokeSession, getUserActivityLogs, getApiKeys, createApiKey, revokeApiKey } from '../controllers/userController'
import { checkValiditi } from '../middleware/checkValidUser'
import { rateLimiter } from '../middleware/rateLimit.middleware'

const router = Router();

// Rate limiter configs
const loginLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please try again in 15 minutes.' });
const registerLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many registration attempts. Please try again in 1 hour.' });
const forgotPasswordLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many password reset requests. Please try again in 1 hour.' });
const twoFaLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many 2FA attempts. Please try again in 15 minutes.' });
const resendLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many verification email requests. Please try again in 1 hour.' });

router.get('/setup-status', getSetupStatus);

router.post('/register', registerLimiter, registerUser);

router.post('/check-email', checkEmailExists)

router.post('/login', loginLimiter, loginUser);

router.post('/logout', logoutUser);


router.get('/profile', checkValiditi, userProfile);

router.get('/verify-email', checkValiditi, verify_email);

router.post('/send-verification-email', checkValiditi, send_verification_email);

router.post('/resend-verification-email', resendLimiter, resendVerificationByEmail);

router.post('/verify-email-token', verifyEmailToken);

router.get('/verify-email-link', verifyEmailViaLink);

router.put('/update-name', checkValiditi, editUserName);

router.put('/update-avatar', checkValiditi, editUserAvatar);

router.put('/update-password', checkValiditi, changeUserPassword);

router.post('/forgot-password', forgotPasswordLimiter, forgotUserPassword);

router.post('/reset-password', forgotPasswordLimiter, resetUserPassword);

// Returns current user if authenticated (reads httpOnly cookie or Authorization header)
router.get('/me', checkValiditi, getCurrentUser);

// 2FA Routes
router.post('/verify-2fa', twoFaLimiter, verify2FaUser);
router.put('/toggle-2fa', checkValiditi, toggle2FaUser);

// User Profile & Departments Routes
router.put('/update-profile', checkValiditi, updateUserProfile);
router.get('/departments', checkValiditi, getDepartments);

// Active Sessions
router.get('/sessions', checkValiditi, getUserSessions);
router.delete('/sessions/:id', checkValiditi, revokeSession);

// Activity Logs
router.get('/activity-logs', checkValiditi, getUserActivityLogs);

// API Keys
router.get('/api-keys', checkValiditi, getApiKeys);
router.post('/api-keys', checkValiditi, createApiKey);
router.delete('/api-keys/:id', checkValiditi, revokeApiKey);



export default router;