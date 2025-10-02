import express from 'express';
import {
  register,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  resendOTP
} from '../controllers/userController.js';


const router = express.Router();

router.post('/register',  register);
router.post('/verify-otp',  verifyOTP);
router.post('/login',  login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOTP);

export default router;