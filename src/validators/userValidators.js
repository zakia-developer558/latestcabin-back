import Joi from 'joi';

export const registerValidation = (data) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Fornavn er påkrevd',
        'string.min': 'Fornavn må være minst 2 tegn langt',
        'string.max': 'Fornavn kan ikke overstige 50 tegn',
        'any.required': 'Fornavn er påkrevd'
      }),
    
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Etternavn er påkrevd',
        'string.min': 'Etternavn må være minst 2 tegn langt',
        'string.max': 'Etternavn kan ikke overstige 50 tegn',
        'any.required': 'Etternavn er påkrevd'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .normalize()
      .messages({
        'string.email': 'Vennligst oppgi en gyldig e-postadresse',
        'string.empty': 'E-post er påkrevd',
        'any.required': 'E-post er påkrevd'
      }),
    
    password: Joi.string()
      .min(6)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.min': 'Passord må være minst 6 tegn langt',
        'string.pattern.base': 'Passord må inneholde minst én liten bokstav, én stor bokstav og ett tall',
        'string.empty': 'Passord er påkrevd',
        'any.required': 'Passord er påkrevd'
      }),
    
    companyName: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .allow(null, '')
      .messages({
        'string.min': 'Firmanavn må være minst 2 tegn langt',
        'string.max': 'Firmanavn kan ikke overstige 100 tegn'
      }),
    
    companyColor: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .optional()
      .allow(null, '')
      .messages({
        'string.pattern.base': 'Firmafargen må være en gyldig hex-fargekode (f.eks. #3B82F6)'
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