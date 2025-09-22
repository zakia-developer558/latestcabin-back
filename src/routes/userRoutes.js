import express from 'express';
import {
  register,
  // verifyOTP, // OTP VERIFICATION DISABLED - Commented out for development
  login,
  forgotPassword,
  resetPassword,
  // resendOTP // OTP RESEND DISABLED - Commented out for development
} from '../controllers/userController.js';


const router = express.Router();

router.post('/register',  register);
// router.post('/verify-otp',  verifyOTP); // OTP VERIFICATION DISABLED - Commented out for development
router.post('/login',  login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
// router.post('/resend-otp', resendOTP); // OTP RESEND DISABLED - Commented out for development

export default router;