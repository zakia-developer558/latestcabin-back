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
  // Check if this is a multi-segment booking first
  if (data.segments && Array.isArray(data.segments)) {
    // Define segment schema for multi-booking validation
    const segmentSchema = Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      startHalf: Joi.string().valid('AM', 'PM').default('AM'),
      endHalf: Joi.string().valid('AM', 'PM').default('PM')
    }).custom((value, helpers) => {
      // For same-day bookings, allow equal dates
      if (new Date(value.endDate).getTime() < new Date(value.startDate).getTime()) {
        return helpers.error('any.custom', { message: 'endDate must be after or equal to startDate' });
      }
      return value;
    }, 'segment dates order validation');

    const multiSegmentSchema = Joi.object({
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
          return helpers.error('any.custom', { message: 'Segments overlap each other' });
        }
      }
      return value;
    }, 'segments non-overlap validation');

    return multiSegmentSchema.validate(data, { abortEarly: false });
  }

  // For single day and date range bookings
  const schema = Joi.alternatives().try(
    // Exact time window booking (explicit start/end datetimes)
    Joi.object({
      startDateTime: Joi.date().iso().required(),
      endDateTime: Joi.date().iso().required(),
      guestName: Joi.string().trim().min(2).max(100).required(),
      guestAddress: Joi.string().trim().min(2).max(200).required(),
      guestPostalCode: Joi.string().trim().min(2).max(20).required(),
      guestCity: Joi.string().trim().min(2).max(100).required(),
      guestPhone: Joi.string().trim().min(5).max(30).required(),
      guestEmail: Joi.string().email().lowercase().trim().required(),
      guestAffiliation: Joi.string().trim().allow('', null)
    }).custom((value, helpers) => {
      const start = new Date(value.startDateTime);
      const end = new Date(value.endDateTime);
      if (isNaN(start) || isNaN(end)) {
        return helpers.error('any.custom', { message: 'Invalid startDateTime or endDateTime' });
      }
      if (end <= start) {
        return helpers.error('any.custom', { message: 'endDateTime must be after startDateTime' });
      }
      // Disallow mixing with other shapes
      const mixedKeys = ['date','half','startTime','endTime','startDate','endDate','startHalf','endHalf'];
      for (const k of mixedKeys) {
        if (k in value) {
          return helpers.error('any.custom', { message: `Do not mix ${k} with startDateTime/endDateTime` });
        }
      }
      return value;
    }, 'exact datetime window validation'),
    // Single day booking
    Joi.object({
      date: Joi.date().iso().required(),
      half: Joi.string().valid('AM', 'PM', 'FULL').default('FULL'),
      // Optional custom times for half-day bookings (HH:MM)
      startTime: Joi.string()
        .pattern(/^\d{2}:\d{2}$/)
        .optional()
        .messages({ 'string.pattern.base': 'startTime must be in HH:MM format' }),
      endTime: Joi.string()
        .pattern(/^\d{2}:\d{2}$/)
        .optional()
        .messages({ 'string.pattern.base': 'endTime must be in HH:MM format' }),
      guestName: Joi.string().trim().min(2).max(100).required(),
      guestAddress: Joi.string().trim().min(2).max(200).required(),
      guestPostalCode: Joi.string().trim().min(2).max(20).required(),
      guestCity: Joi.string().trim().min(2).max(100).required(),
      guestPhone: Joi.string().trim().min(5).max(30).required(),
      guestEmail: Joi.string().email().lowercase().trim().required(),
      guestAffiliation: Joi.string().trim().allow('', null)
    }).custom((value, helpers) => {
      // If custom times are provided for half-day, validate ranges and order
      const { half, startTime, endTime } = value;
      if (half === 'FULL') return value; // ignore custom times for FULL
      if ((startTime || endTime) && (half === 'AM' || half === 'PM')) {
        const parse = (t) => {
          const [hh, mm] = t.split(':').map((v) => parseInt(v, 10));
          return { hh, mm };
        };
        if (!startTime || !endTime) {
          return helpers.error('any.custom', { message: 'Both startTime and endTime must be provided for half-day custom times' });
        }
        const { hh: sh, mm: sm } = parse(startTime);
        const { hh: eh, mm: em } = parse(endTime);
        if (Number.isNaN(sh) || Number.isNaN(sm) || sh < 0 || sh > 23 || sm < 0 || sm > 59) {
          return helpers.error('any.custom', { message: 'Invalid startTime value' });
        }
        if (Number.isNaN(eh) || Number.isNaN(em) || eh < 0 || eh > 23 || em < 0 || em > 59) {
          return helpers.error('any.custom', { message: 'Invalid endTime value' });
        }
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        if (endMinutes <= startMinutes) {
          return helpers.error('any.custom', { message: 'endTime must be after startTime' });
        }
        // Enforce half boundaries
        if (half === 'AM') {
          if (startMinutes < 0 || endMinutes > 12 * 60) {
            return helpers.error('any.custom', { message: 'AM half-time must be between 00:00 and 12:00' });
          }
        } else if (half === 'PM') {
          if (startMinutes < 12 * 60 || endMinutes > 24 * 60) {
            return helpers.error('any.custom', { message: 'PM half-time must be between 12:00 and 24:00' });
          }
        }
      }
      return value;
    }, 'half custom time validation'),
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
        return helpers.error('any.custom', { message: 'endDate must be after startDate' });
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


