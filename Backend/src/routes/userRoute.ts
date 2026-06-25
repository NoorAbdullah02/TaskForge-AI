import { Router } from "express";
import { registerUser, changeUserPassword, forgotUserPassword, resetUserPassword, loginUser, checkEmailExists, getCurrentUser, logoutUser, userProfile, verify_email, send_verification_email, verifyEmailToken, resendVerificationByEmail, editUserName, editUserAvatar, verify2FaUser, toggle2FaUser, updateUserProfile, getDepartments } from '../controllers/userController'
import { checkValiditi } from '../middleware/checkValidUser'


const router = Router();

router.post('/register', registerUser);

router.post('/check-email', checkEmailExists)

router.post('/login', loginUser);

router.post('/logout', logoutUser);


router.get('/profile', checkValiditi, userProfile);

router.get('/verify-email', checkValiditi, verify_email);

router.post('/send-verification-email', checkValiditi, send_verification_email);

router.post('/resend-verification-email', resendVerificationByEmail);

router.post('/verify-email-token', verifyEmailToken);

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



export default router; 