import Joi from 'joi';

// Validation for creating a new legend
export const createLegendValidation = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    
    color: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .required()
      .messages({
        'string.pattern.base': 'Color must be a valid hex color code (e.g., #ffffff or #fff)',
        'any.required': 'Color is required'
      }),
    
    bgColor: Joi.string()
      .pattern(/^(bg-[a-z]+-\d{2,3}(\s+dark:bg-[a-z]+-\d{2,3})?|bg-[a-z]+-\d{2,3})$/)
      .default('bg-gray-100')
      .messages({
        'string.pattern.base': 'Background color must be a valid Tailwind CSS class (e.g., bg-red-100 or bg-red-100 dark:bg-red-900)'
      }),
    
    borderColor: Joi.string()
      .pattern(/^(border-[a-z]+-\d{2,3}(\s+dark:border-[a-z]+-\d{2,3})?|border-[a-z]+-\d{2,3})$/)
      .default('border-gray-200')
      .messages({
        'string.pattern.base': 'Border color must be a valid Tailwind CSS class (e.g., border-red-200 or border-red-200 dark:border-red-700)'
      }),
    
    textColor: Joi.string()
      .pattern(/^(text-[a-z]+-\d{2,3}(\s+dark:text-[a-z]+-\d{2,3})?|text-[a-z]+-\d{2,3})$/)
      .default('text-gray-800')
      .messages({
        'string.pattern.base': 'Text color must be a valid Tailwind CSS class (e.g., text-red-800 or text-red-800 dark:text-red-200)'
      }),
    
    isActive: Joi.boolean()
      .default(true),
    
    isDefault: Joi.boolean()
      .default(false),
    
    companySlug: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .allow(null)
      .messages({
        'string.min': 'Company slug must be at least 2 characters long',
        'string.max': 'Company slug cannot exceed 100 characters'
      }),
    
    description: Joi.string()
      .trim()
      .max(200)
      .allow('', null)
      .default('')
      .messages({
        'string.max': 'Description cannot exceed 200 characters'
      })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }
  
  req.body = value;
  next();
};

// Validation for updating an existing legend
export const updateLegendValidation = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .messages({
        'string.empty': 'Name cannot be empty',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    
    color: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .messages({
        'string.pattern.base': 'Color must be a valid hex color code (e.g., #ffffff or #fff)'
      }),
    
    bgColor: Joi.string()
      .pattern(/^(bg-[a-z]+-\d{2,3}(\s+dark:bg-[a-z]+-\d{2,3})?|bg-[a-z]+-\d{2,3})$/)
      .messages({
        'string.pattern.base': 'Background color must be a valid Tailwind CSS class (e.g., bg-red-100 or bg-red-100 dark:bg-red-900)'
      }),
    
    borderColor: Joi.string()
      .pattern(/^(border-[a-z]+-\d{2,3}(\s+dark:border-[a-z]+-\d{2,3})?|border-[a-z]+-\d{2,3})$/)
      .messages({
        'string.pattern.base': 'Border color must be a valid Tailwind CSS class (e.g., border-red-200 or border-red-200 dark:border-red-700)'
      }),
    
    textColor: Joi.string()
      .pattern(/^(text-[a-z]+-\d{2,3}(\s+dark:text-[a-z]+-\d{2,3})?|text-[a-z]+-\d{2,3})$/)
      .messages({
        'string.pattern.base': 'Text color must be a valid Tailwind CSS class (e.g., text-red-800 or text-red-800 dark:text-red-200)'
      }),
    
    isActive: Joi.boolean(),
    
    isDefault: Joi.boolean(),
    
    companySlug: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .allow(null)
      .messages({
        'string.min': 'Company slug must be at least 2 characters long',
        'string.max': 'Company slug cannot exceed 100 characters'
      }),
    
    description: Joi.string()
      .trim()
      .max(200)
      .allow('', null)
      .messages({
        'string.max': 'Description cannot exceed 200 characters'
      })
  })
  .min(1) // At least one field must be provided for update
  .messages({
    'object.min': 'At least one field must be provided for update'
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }
  
  req.body = value;
  next();
};

// Validation for legend ID parameter
export const legendIdValidation = (req, res, next) => {
  const schema = Joi.string()
    .required()
    .messages({
      'any.required': 'Legend ID is required',
      'string.empty': 'Legend ID cannot be empty'
    });

  const { error, value } = schema.validate(req.params.id, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }
  
  req.params.id = value;
  next();
};

// Validation for query parameters
export const legendQueryValidation = (req, res, next) => {
  const schema = Joi.object({
    active: Joi.string()
      .valid('true', 'false')
      .messages({
        'any.only': 'Active parameter must be either "true" or "false"'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      })
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => detail.message)
    });
  }
  
  // Don't overwrite req.query, just validate it
  next();
};