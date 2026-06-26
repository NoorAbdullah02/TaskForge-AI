import { Router } from "express";
import { registerUser, changeUserPassword, forgotUserPassword, resetUserPassword, loginUser, checkEmailExists, getCurrentUser, logoutUser, userProfile, verify_email, send_verification_email, verifyEmailToken, resendVerificationByEmail, editUserName, editUserAvatar, verify2FaUser, toggle2FaUser, updateUserProfile, getDepartments, verifyEmailViaLink, getSetupStatus, getUserSessions, revokeSession, getUserActivityLogs, getApiKeys, createApiKey, revokeApiKey } from '../controllers/userController'
import { checkValiditi } from '../middleware/checkValidUser'


const router = Router();

router.get('/setup-status', getSetupStatus);

router.post('/register', registerUser);

router.post('/check-email', checkEmailExists)

router.post('/login', loginUser);

router.post('/logout', logoutUser);


router.get('/profile', checkValiditi, userProfile);

router.get('/verify-email', checkValiditi, verify_email);

router.post('/send-verification-email', checkValiditi, send_verification_email);

router.post('/resend-verification-email', resendVerificationByEmail);

router.post('/verify-email-token', verifyEmailToken);

router.get('/verify-email-link', verifyEmailViaLink);

router.put('/update-name', checkValiditi, editUserName);

router.put('/update-avatar', checkValiditi, editUserAvatar);

router.put('/update-password', checkValiditi, changeUserPassword);

router.post('/forgot-password', forgotUserPassword);

router.post('/reset-password', resetUserPassword);

// Returns current user if authenticated (reads httpOnly cookie or Authorization header)
router.get('/me', checkValiditi, getCurrentUser);

// 2FA Routes
router.post('/verify-2fa', verify2FaUser);
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