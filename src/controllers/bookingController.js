import { availabilityValidation, createBookingValidation, createMultiBookingValidation, blockDatesValidation } from '../validators/bookingValidators.js';
import { checkAvailability, createBooking, createMultiBooking, getBookedDates, getCalendarData, blockDates, cancelBooking, ownerCancelBooking, getBookingById, getUserBookings, getOwnerBookings, getCabinBookings, getBlocks, removeBlock, updateBlock, getPendingBookings, approveBooking, rejectBooking } from '../services/bookingService.js';

export const availability = async (req, res) => {
  try {
    const { error, value } = availabilityValidation(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details });
    }
    
    let result;
    if (value.date) {
      // Single day availability
      result = await checkAvailability(req.params.slug, value.date, value.date, value.half, value.half);
    } else {
      // Date range availability
      const { startDate, endDate, startHalf, endHalf } = value;
      result = await checkAvailability(req.params.slug, startDate, endDate, startHalf, endHalf);
    }
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const book = async (req, res) => {
  try {
    const { error, value } = createBookingValidation(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details });
    }
    const booking = await createBooking(req.params.slug, value, req.user || null);
    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ success: false, message: err.message });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const bookMulti = async (req, res) => {
  try {
    const { error, value } = createMultiBookingValidation(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details });
    }
    const created = await createMultiBooking(req.params.slug, value, req.user || null);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ success: false, message: err.message });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const bookedDates = async (req, res) => {
  try {
    const data = await getBookedDates(req.params.slug);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const calendarData = async (req, res) => {
  try {
    const { slug } = req.params;
    const { year, month } = req.query;
    
    // Default to current month if not provided
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    
    // Validate year and month
    if (targetYear < 2020 || targetYear > 2030) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ success: false, message: 'Invalid month' });
    }
    
    const data = await getCalendarData(slug, targetYear, targetMonth);
    
    // Add helpful information about the request
    data.requested = {
      year: targetYear,
      month: targetMonth,
      slug: slug
    };
    
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const block = async (req, res) => {
  try {
    const { error, value } = blockDatesValidation(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.details });
    }
    const result = await blockDates(req.params.slug, value, req.user);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.status === 409) return res.status(409).json({ success: false, message: err.message });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const cancel = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { bookingId } = req.params;
    const result = await cancelBooking(bookingId, req.user);
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Booking not found') return res.status(404).json({ success: false, message: 'Booking not found' });
    if (err.message === 'Booking is already cancelled') return res.status(400).json({ success: false, message: err.message });
    if (err.message === 'Cannot cancel past bookings') return res.status(400).json({ success: false, message: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const ownerCancel = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owners can use this endpoint' });
    }

    const { bookingId } = req.params;
    const result = await ownerCancelBooking(bookingId, req.user);
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: err.message });
    if (err.message === 'Booking not found') return res.status(404).json({ success: false, message: 'Booking not found' });
    if (err.message === 'Booking is already cancelled') return res.status(400).json({ success: false, message: err.message });
    if (err.message === 'Cannot cancel a rejected booking') return res.status(400).json({ success: false, message: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getBookingDetails = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { bookingId } = req.params;
    const booking = await getBookingById(bookingId, req.user);
    
    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Booking not found') return res.status(404).json({ success: false, message: 'Booking not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { limit, page, status } = req.query;
    const result = await getUserBookings(req.user.userId, { limit, page, status });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getOwnerAllBookings = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { limit, page, status, cabinSlug } = req.query;
    const result = await getOwnerBookings(req.user.userId, { limit, page, status, cabinSlug });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getCabinAllBookings = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { slug } = req.params;
    const { limit, page, status } = req.query;
    const result = await getCabinBookings(slug, req.user, { limit, page, status });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const updateBookingStatusController = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { bookingId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const booking = await updateBookingStatus(bookingId, status, req.user);
    
    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Booking not found') return res.status(404).json({ success: false, message: 'Booking not found' });
    if (err.message === 'Invalid status') return res.status(400).json({ success: false, message: 'Invalid status' });
    if (err.message === 'Cannot modify past bookings') return res.status(400).json({ success: false, message: 'Cannot modify past bookings' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { bookingId } = req.params;
    const booking = await updateBookingDetails(bookingId, req.body, req.user);
    
    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Booking not found') return res.status(404).json({ success: false, message: 'Booking not found' });
    if (err.message === 'Cannot update past bookings') return res.status(400).json({ success: false, message: 'Cannot update past bookings' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

// Block management controllers
export const getCabinBlocks = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { slug } = req.params;
    const blocks = await getBlocks(slug, req.user);
    
    return res.status(200).json({ success: true, data: blocks });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const removeBlockController = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { slug, blockId } = req.params;
    const result = await removeBlock(slug, blockId, req.user);
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    if (err.message === 'Block not found') return res.status(404).json({ success: false, message: 'Block not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const updateBlockController = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { slug, blockId } = req.params;
    const block = await updateBlock(slug, blockId, req.body, req.user);
    
    return res.status(200).json({ success: true, data: block });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    if (err.message === 'Block not found') return res.status(404).json({ success: false, message: 'Block not found' });
    if (err.message === 'End date must be after start date') return res.status(400).json({ success: false, message: 'End date must be after start date' });
    if (err.message === 'Cannot update block dates - would overlap with existing bookings') return res.status(409).json({ success: false, message: 'Cannot update block dates - would overlap with existing bookings' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

// Admin approval/rejection controllers
export const approveBookingController = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { bookingId } = req.params;
    const { sendEmail } = req.body || {};
    const result = await approveBooking(bookingId, req.user, { sendEmail });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Booking not found') return res.status(404).json({ success: false, message: 'Booking not found' });
    if (err.message === 'Only pending bookings can be approved') return res.status(400).json({ success: false, message: 'Only pending bookings can be approved' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const rejectBookingController = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { bookingId } = req.params;
    const { sendEmail } = req.body || {};
    const result = await rejectBooking(bookingId, req.user, { sendEmail });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Booking not found') return res.status(404).json({ success: false, message: 'Booking not found' });
    if (err.message === 'Only pending bookings can be rejected') return res.status(400).json({ success: false, message: 'Only pending bookings can be rejected' });
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getPendingBookingsController = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { limit, page, cabinSlug } = req.query;
    const result = await getPendingBookings(req.user, { limit, page, cabinSlug });
    
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (err.message === 'Cabin not found') return res.status(404).json({ success: false, message: 'Cabin not found' });
    return res.status(400).json({ success: false, message: err.message });
  }
};
