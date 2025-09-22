import Joi from 'joi';

export const availabilityValidation = (data) => {
  const schema = Joi.alternatives().try(
    // Single day availability
    Joi.object({
      date: Joi.date().iso().required(),
      half: Joi.string().valid('AM', 'PM', 'FULL').default('FULL')
    }),
    // Date range availability
    Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      startHalf: Joi.string().valid('AM', 'PM').default('AM'),
      endHalf: Joi.string().valid('AM', 'PM').default('PM')
    })
  );
  return schema.validate(data, { abortEarly: false });
};

export const createBookingValidation = (data) => {
  const schema = Joi.alternatives().try(
    // Single day booking
    Joi.object({
      date: Joi.date().iso().required(),
      half: Joi.string().valid('AM', 'PM', 'FULL').default('FULL'),
      guestName: Joi.string().trim().min(2).max(100).required(),
      guestAddress: Joi.string().trim().min(2).max(200).required(),
      guestPostalCode: Joi.string().trim().min(2).max(20).required(),
      guestCity: Joi.string().trim().min(2).max(100).required(),
      guestPhone: Joi.string().trim().min(5).max(30).required(),
      guestEmail: Joi.string().email().lowercase().trim().required(),
      guestAffiliation: Joi.string().trim().allow('', null)
    }),
    // Date range booking
    Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      startHalf: Joi.string().valid('AM', 'PM').default('AM'),
      endHalf: Joi.string().valid('AM', 'PM').default('PM'),
      guestName: Joi.string().trim().min(2).max(100).required(),
      guestAddress: Joi.string().trim().min(2).max(200).required(),
      guestPostalCode: Joi.string().trim().min(2).max(20).required(),
      guestCity: Joi.string().trim().min(2).max(100).required(),
      guestPhone: Joi.string().trim().min(5).max(30).required(),
      guestEmail: Joi.string().email().lowercase().trim().required(),
      guestAffiliation: Joi.string().trim().allow('', null)
    }).custom((value, helpers) => {
      if (new Date(value.endDate) <= new Date(value.startDate)) {
        return helpers.error('any.custom', 'endDate must be after startDate');
      }
      return value;
    }, 'dates order validation')
  );

  return schema.validate(data, { abortEarly: false });
};

export const createMultiBookingValidation = (data) => {
  const segmentSchema = Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    startHalf: Joi.string().valid('AM', 'PM').default('AM'),
    endHalf: Joi.string().valid('AM', 'PM').default('PM')
  }).custom((value, helpers) => {
    if (new Date(value.endDate) <= new Date(value.startDate)) {
      return helpers.error('any.custom', 'endDate must be after startDate');
    }
    return value;
  }, 'segment dates order validation');

  const schema = Joi.object({
    segments: Joi.array().items(segmentSchema).min(1).max(10).required(),
    guestName: Joi.string().trim().min(2).max(100).required(),
    guestAddress: Joi.string().trim().min(2).max(200).required(),
    guestPostalCode: Joi.string().trim().min(2).max(20).required(),
    guestCity: Joi.string().trim().min(2).max(100).required(),
    guestPhone: Joi.string().trim().min(5).max(30).required(),
    guestEmail: Joi.string().email().lowercase().trim().required(),
    guestAffiliation: Joi.string().trim().allow('', null)
  }).custom((value, helpers) => {
    // ensure segments don't overlap each other
    const toMs = (d) => new Date(d).getTime();
    const sorted = value.segments.slice().sort((a,b) => toMs(a.startDate) - toMs(b.startDate));
    for (let i = 1; i < sorted.length; i++) {
      if (toMs(sorted[i-1].endDate) > toMs(sorted[i].startDate)) {
        return helpers.error('any.custom', 'Segments overlap each other');
      }
    }
    return value;
  }, 'segments non-overlap validation');

  return schema.validate(data, { abortEarly: false });
};

export const blockDatesValidation = (data) => {
  const baseSchema = Joi.object({
    action: Joi.string().valid('block', 'unblock').default('block'),
    reason: Joi.string().trim().allow('', null)
  });

  // Single date schema
  const singleDateSchema = baseSchema.keys({
    date: Joi.date().iso().required(),
    half: Joi.string().valid('AM', 'PM', 'FULL').default('FULL')
  });

  // Date range schema
  const rangeSchema = baseSchema.keys({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    startHalf: Joi.string().valid('AM', 'PM').default('AM'),
    endHalf: Joi.string().valid('AM', 'PM').default('PM')
  }).custom((value, helpers) => {
    if (new Date(value.endDate) <= new Date(value.startDate)) {
      return helpers.error('any.custom', 'endDate must be after startDate');
    }
    return value;
  }, 'dates order validation');

  // Multiple dates schema
  const datesListSchema = baseSchema.keys({
    dates: Joi.array().items(
      Joi.alternatives().try(
        Joi.date().iso().required(),
        Joi.object({
          date: Joi.date().iso().required(),
          half: Joi.string().valid('AM', 'PM').required()
        })
      )
    ).min(1).required()
  });

  // Use a more flexible approach - check what fields are present
  const schema = Joi.object().custom((value, helpers) => {
    // Check if it's a single date
    if (value.date && !value.startDate && !value.dates) {
      return singleDateSchema.validate(value);
    }
    // Check if it's a date range
    if (value.startDate && value.endDate && !value.date && !value.dates) {
      return rangeSchema.validate(value);
    }
    // Check if it's multiple dates
    if (value.dates && !value.date && !value.startDate) {
      return datesListSchema.validate(value);
    }
    
    return helpers.error('any.custom', 'Invalid payload: must provide either date, startDate/endDate, or dates array');
  }, 'payload type validation');

  return schema.validate(data, { abortEarly: false });
};


