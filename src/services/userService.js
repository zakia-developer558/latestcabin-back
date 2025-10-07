import User from '../models/User.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/emailUtils.js';
import { sendWelcomeEmail, sendOTPEmail } from '../utils/notificationEmails.js';

export const registerUser = async (userData) => {
  const { email, firstName, lastName, password, companyName, companyColor, role = 'user' } = userData;
  
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
    companyColor,
    role,
    isVerified: false // Require OTP verification
  });
  
  // Generate OTP and send email (non-blocking)
  try {
    const otpCode = await User.generateOTP(user._id);
    await sendOTPEmail(user.email, otpCode, user.firstName);
  } catch (e) {
    console.warn('OTP email failed:', e?.message || e);
  }
  
  // Generate token for immediate login after registration
  return {
      message: 'Registreringen var vellykket. Vi har sendt en engangskode til e-posten din.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        slug: user.slug,
      companyName: user.companyName,
      companySlug: user.companySlug,
      companyColor: user.companyColor,
      role: user.role,
      isVerified: false
      }
    };
};

export const verifyOTP = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Bruker ikke funnet');
  }
  if (user.isVerified) {
    throw new Error('Bruker er allerede bekreftet');
  }
  if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
    throw new Error('Ingen OTP funnet for denne brukeren');
  }
  if (user.otp.code !== otp) {
    throw new Error('Ugyldig OTP-kode');
  }
  if (new Date(user.otp.expiresAt) < new Date()) {
    throw new Error('OTP-koden har utløpt');
  }

  await User.findByIdAndUpdate(user._id, { isVerified: true, otp: undefined });

  // Send welcome email (non-blocking)
  try {
    await sendWelcomeEmail(email, user.firstName);
  } catch (e) {
    console.warn('Welcome email failed:', e?.message || e);
  }

  const token = generateToken({ userId: user._id, email: user.email, role: user.role });
  return {
    message: 'Konto bekreftet',
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      slug: user.slug,
      companyName: user.companyName,
      companySlug: user.companySlug,
      companyColor: user.companyColor,
      role: user.role,
      isVerified: true
    }
  };
};

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
      companyColor: user.companyColor,
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
    // Fetch user by ID and validate token and expiry in memory to avoid Firestore composite index constraints
    const user = await User.findById(decoded.userId);
    if (!user || user.resetPasswordToken !== token || !user.resetPasswordExpires || new Date(user.resetPasswordExpires) <= new Date()) {
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

export const resendOTP = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Bruker ikke funnet');
  }
  if (user.isVerified) {
    throw new Error('Bruker er allerede bekreftet');
  }
  const otpCode = await User.generateOTP(user._id);
  await sendOTPEmail(email, otpCode, user.firstName);
  return { message: 'OTP sendt på e-post' };
};