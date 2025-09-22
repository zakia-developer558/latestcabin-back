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
    contact_person_employer: Joi.string().trim().allow('', null),
    is_member: Joi.boolean().default(false)
  });

  return schema.validate(data, { abortEarly: false });
};








