import * as authService from '../services/userService.js';
import {
  registerValidation,
  loginValidation,
  // verifyOTPValidation, // OTP VALIDATION DISABLED - Commented out for development
  forgotPasswordValidation,
  resetPasswordValidation,
  // resendOTPValidation // OTP RESEND VALIDATION DISABLED - Commented out for development
} from '../validators/userValidators.js';

export const register = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = registerValidation(req.body);
    
    if (error) {
      // Create more detailed error messages
      const validationErrors = error.details.map(detail => {
        const field = detail.path.join('.');
        let message = detail.message;
        
        // Provide more specific error context based on field
        switch (field) {
          case 'firstName':
            message = `Fornavn: ${detail.message}`;
            break;
          case 'lastName':
            message = `Etternavn: ${detail.message}`;
            break;
          case 'email':
            message = `E-post: ${detail.message}`;
            break;
          case 'password':
            message = `Passord: ${detail.message}`;
            break;
          case 'companyName':
            message = `Firmanavn: ${detail.message}`;
            break;
          default:
            message = `${field}: ${detail.message}`;
        }
        
        return {
          field,
          message,
          type: detail.type
        };
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validering feilet',
        errors: validationErrors
      });
    }
    
    const result = await authService.registerUser(value);
    
    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// OTP VERIFICATION DISABLED - Commented out for development
/*
export const verifyOTP = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = verifyOTPValidation(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    const { email, otp } = value;
    const result = await authService.verifyOTP(email, otp);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
*/

export const login = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginValidation(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    const { email, password } = value;
    const result = await authService.loginUser(email, password);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = forgotPasswordValidation(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    const { email } = value;
    const result = await authService.forgotPassword(email);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = resetPasswordValidation(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    const { token, password } = value;
    const result = await authService.resetPassword(token, password);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// OTP RESEND DISABLED - Commented out for development
/*
export const resendOTP = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = resendOTPValidation(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    const { email } = value;
    const result = await authService.resendOTP(email);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
*/