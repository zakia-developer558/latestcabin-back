import Joi from 'joi';

export const registerValidation = (data) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.empty': 'First name is required',
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
      }),
    
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .normalize()
      .messages({
        'string.email': 'Please provide a valid email',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(6)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      }),
    
    role: Joi.string()
      .valid('user', 'owner', 'admin')
      .default('user')
  });
  
  return schema.validate(data, { abortEarly: false });
};

export const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .normalize()
      .messages({
        'string.email': 'Please provide a valid email',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
  });
  
  return schema.validate(data, { abortEarly: false });
};

export const verifyOTPValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .normalize()
      .messages({
        'string.email': 'Please provide a valid email',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
      }),
    
    otp: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'string.empty': 'OTP is required',
        'any.required': 'OTP is required'
      })
  });
  
  return schema.validate(data, { abortEarly: false });
};

export const forgotPasswordValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .normalize()
      .messages({
        'string.email': 'Please provide a valid email',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
      })
  });
  
  return schema.validate(data, { abortEarly: false });
};

export const resetPasswordValidation = (data) => {
  const schema = Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'string.empty': 'Token is required',
        'any.required': 'Token is required'
      }),
    
    password: Joi.string()
      .min(6)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
  });
  
  return schema.validate(data, { abortEarly: false });
};

export const resendOTPValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .normalize()
      .messages({
        'string.email': 'Please provide a valid email',
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
      })
  });
  
  return schema.validate(data, { abortEarly: false });
};