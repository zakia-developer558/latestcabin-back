import User from '../models/User.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { 
  // sendOTPEmail, // OTP EMAIL DISABLED - Commented out for development
  sendPasswordResetEmail, 
  // sendWelcomeEmail // WELCOME EMAIL DISABLED - Commented out for development
} from '../utils/emailUtils.js';

export const registerUser = async (userData) => {
  const { email, firstName, lastName, password, companyName, role = 'user' } = userData;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Brukeren finnes allerede med denne e-postadressen');
  }
  
  // Create new user (companySlug will be auto-generated from companyName)
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    companyName,
    role,
    isVerified: true // Mark user as verified on registration
  });
  
  // OTP EMAIL DISABLED - Commented out for development
  // Send OTP email
  // await sendOTPEmail(email, otpCode, firstName);
  
  // Generate token for immediate login after registration
  const token = generateToken({ 
    userId: user._id, 
    email: user.email, 
    role: user.role 
  });
  
  return {
      message: 'Registreringen var vellykket. Du er nå logget inn.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        slug: user.slug,
        companyName: user.companyName,
        companySlug: user.companySlug,
        role: user.role
      }
    };
};

// OTP VERIFICATION DISABLED - Commented out for development
/*
export const verifyOTP = async (email, otp) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.isVerified) {
    throw new Error('User is already verified');
  }
  
  if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
    throw new Error('No OTP found for this user');
  }
  
  if (user.otp.code !== otp) {
    throw new Error('Invalid OTP');
  }
  
  if (user.otp.expiresAt < new Date()) {
    throw new Error('OTP has expired');
  }
  
  // Mark user as verified and clear OTP
  user.isVerified = true;
  user.otp = undefined;
  await user.save();
  
  // Send welcome email
  await sendWelcomeEmail(email, user.firstName);
  
  // Generate token
  const token = generateToken({ 
    userId: user._id, 
    email: user.email, 
    role: user.role 
  });
  
  return {
    message: 'Account verified successfully',
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  };
};
*/

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('Ugyldig legitimasjon');
  }
  
  if (!user.isVerified) {
    throw new Error(' Vennligst bekreft kontoen din først');
  }
  
  const isPasswordValid = await User.comparePassword(user._id, password);
  if (!isPasswordValid) {
    throw new Error('Ugyldig legitimasjon');
  }
  
  // Generate token
  const token = generateToken({ 
    userId: user._id, 
    email: user.email, 
    role: user.role 
  });
  
  return {
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      slug: user.slug,
      companyName: user.companyName,
      companySlug: user.companySlug,
      role: user.role
    }
  };
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('User not found with this email');
  }
  
  // Generate reset token
  const resetToken = generateToken({ userId: user._id });
  
  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: resetToken,
    resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  });
  
  // Send password reset email
  await sendPasswordResetEmail(email, resetToken, user.firstName);
  
  return {
    message: 'Password reset instructions sent to your email'
  };
};

export const resetPassword = async (token, newPassword) => {
  try {
    // Verify token
    const decoded = verifyToken(token);
    
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });
    
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }
    
    // Update password and clear reset token
    await User.findByIdAndUpdate(user._id, {
      password: newPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined
    });
    
    return {
      message: 'Password reset successfully'
    };
  } catch (error) {
    throw new Error('Invalid or expired reset token');
  }
};

// OTP RESEND DISABLED - Commented out for development
/*
export const resendOTP = async (email) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.isVerified) {
    throw new Error('User is already verified');
  }
  
  // Generate new OTP
  const otpCode = user.generateOTP();
  await user.save();
  
  // Send OTP email
  await sendOTPEmail(email, otpCode, user.firstName);
  
  return {
    message: 'OTP sent successfully'
  };
};
*/