import Joi from 'joi';

export const createCabinValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    address: Joi.string().trim().min(2).max(200).required(),
    postal_code: Joi.string().trim().min(2).max(20).required(),
    city: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().trim().allow('', null),
    email: Joi.string().email().lowercase().trim().allow('', null),
    contact_person_name: Joi.string().trim().allow('', null),
    image: Joi.string().uri().allow('', null),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#3B82F6'),
    halfdayAvailability: Joi.boolean().default(false)
  });

  return schema.validate(data, { abortEarly: false });
};

export const updateCabinValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    address: Joi.string().trim().min(2).max(200).optional(),
    postal_code: Joi.string().trim().min(2).max(20).optional(),
    city: Joi.string().trim().min(2).max(100).optional(),
    phone: Joi.string().trim().allow('', null).optional(),
    email: Joi.string().email().lowercase().trim().allow('', null).optional(),
    contact_person_name: Joi.string().trim().allow('', null).optional(),
    image: Joi.string().uri().allow('', null).optional(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    halfdayAvailability: Joi.boolean().optional()
  });

  return schema.validate(data, { abortEarly: false });
};








