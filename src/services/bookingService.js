import Cabin from '../models/Cabin.js';
import Booking from '../models/Booking.js';
import Unavailability from '../models/Unavailability.js';
import { getNotesForMonth, getAllNotesForCabin } from './notesService.js';
import User from '../models/User.js';
import Legend from '../models/Legend.js';
import { sendBookingCreatedOwnerEmail, sendBookingCreatedGuestEmail, sendBookingStatusEmail } from '../utils/notificationEmails.js';

// Normalize slug same as cabinService.getCabinBySlug
const normalizeSlug = (name) => {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// Find cabin by slug with normalization fallback
const findCabinBySlugFallback = async (slug) => {
  let cabin = await Cabin.findOne({ slug });
  if (cabin) return cabin;
  const normalized = normalizeSlug(slug);
  if (normalized !== slug) {
    cabin = await Cabin.findOne({ slug: normalized });
    if (cabin) return cabin;
  }
  throw new Error('Cabin not found');
};

const rangesOverlap = (startA, endA, startB, endB) => {
  return startA < endB && startB < endA;
};

// Parse an ISO datetime string; if no timezone is present, treat it as UTC
const parseIsoAsUTC = (input) => {
  if (input instanceof Date) return input;
  if (typeof input !== 'string') return new Date(input);
  const hasTz = /([+-]\d{2}:\d{2}|Z)$/i.test(input.trim());
  const normalized = hasTz ? input.trim() : `${input.trim()}Z`;
  return new Date(normalized);
};

const toHalfDayRangeUTC = (startDate, endDate, startHalf = 'AM', endHalf = 'PM') => {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), startHalf === 'AM' ? 0 : 12, 0, 0, 0));
  const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), endHalf === 'AM' ? 12 : 23, endHalf === 'AM' ? 0 : 59, endHalf === 'AM' ? 0 : 59, endHalf === 'AM' ? 0 : 999));
  return { start, end };
};

export const checkAvailability = async (slug, startDate, endDate, startHalf = 'AM', endHalf = 'PM') => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) throw new Error('Cabin not found');

  let start, end;
  
  // Check if we're being called with Date objects (from single-day booking) or strings (from date-range)
  if (startDate instanceof Date && endDate instanceof Date) {
    // Called with computed Date objects from single-day booking
    start = startDate;
    end = endDate;
    } else if (startDate && endDate && startDate === endDate) {
      // Single day check with same start/end date
      const date = new Date(startDate);
      if (startHalf === 'AM' && endHalf === 'AM') {
        start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
        end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 11, 59, 59, 999));
      } else if (startHalf === 'PM' && endHalf === 'PM') {
        start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0));
        end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
      } else {
        // FULL day or mixed: use cabin-defined times if available for full-day cabins
        const [fh, fm] = (cabin.fullDayStartTime || '00:00').split(':').map((v) => parseInt(v, 10));
        const [th, tm] = (cabin.fullDayEndTime || '23:59').split(':').map((v) => parseInt(v, 10));
        start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), fh || 0, fm || 0, 0, 0));
        end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), th || 23, tm || 59, 59, 999));
      }
    } else {
      // Date range check
      const result = toHalfDayRangeUTC(startDate, endDate, startHalf, endHalf);
      start = result.start;
      end = result.end;

      // For full-day coverage ranges on full-day cabins, use cabin-defined times
      if (cabin.halfdayAvailability === false && (startHalf === 'AM' && endHalf === 'PM')) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const [fh, fm] = (cabin.fullDayStartTime || '00:00').split(':').map((v) => parseInt(v, 10));
        const [th, tm] = (cabin.fullDayEndTime || '23:59').split(':').map((v) => parseInt(v, 10));
        start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), fh || 0, fm || 0, 0, 0));
        end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), th || 23, tm || 59, 59, 999));
      }
  }

  // For debugging - remove this after fixing
  console.log('checkAvailability debug:', { startDate, endDate, startHalf, endHalf, start, end, startType: typeof start, endType: typeof end });

  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) {
    throw new Error('Invalid date objects');
  }
  
  // Only check end <= start for date ranges, not for single-day bookings
  if (!(startDate instanceof Date && endDate instanceof Date) && end <= start) {
    throw new Error('endDate must be after startDate');
  }

  const [bookings, blocks] = await Promise.all([
    Booking.find({ cabin: cabin._id, status: { $nin: ['cancelled', 'rejected'] } }),
    Unavailability.find({ cabin: cabin._id })
  ]);
  const conflict = bookings.some(b => rangesOverlap(start, end, b.startDateTime || b.startDate, b.endDateTime || b.endDate))
    || blocks.some(blk => rangesOverlap(start, end, blk.startDate, blk.endDate));

  return { available: !conflict };
};

// New function specifically for single-day availability checks
export const checkSingleDayAvailability = async (slug, start, end) => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) throw new Error('Cabin not found');

  console.log('checkSingleDayAvailability debug:', { start, end, startType: typeof start, endType: typeof end, startISO: start.toISOString(), endISO: end.toISOString() });

  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) {
    throw new Error('Invalid date objects');
  }

  const [bookings, blocks] = await Promise.all([
    Booking.find({ cabin: cabin._id, status: { $nin: ['cancelled', 'rejected'] } }),
    Unavailability.find({ cabin: cabin._id })
  ]);
  const conflict = bookings.some(b => rangesOverlap(start, end, b.startDateTime || b.startDate, b.endDateTime || b.endDate))
    || blocks.some(blk => rangesOverlap(start, end, blk.startDate, blk.endDate));

  return { available: !conflict };
};

export const createBooking = async (slug, payload, user) => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) throw new Error('Cabin not found');

  const now = new Date();

  // Explicit start/end datetime booking
  if (payload.startDateTime && payload.endDateTime && !payload.segments) {
    const start = parseIsoAsUTC(payload.startDateTime);
    const end = parseIsoAsUTC(payload.endDateTime);
    if (isNaN(start) || isNaN(end)) {
      const err = new Error('Invalid startDateTime or endDateTime');
      err.status = 400;
      throw err;
    }
    if (end <= start) {
      const err = new Error('endDateTime must be after startDateTime');
      err.status = 400;
      throw err;
    }
    if (end < now) {
      const err = new Error('Cannot book past dates');
      err.status = 400;
      throw err;
    }

    // Check availability for the exact window
    const { available } = await checkSingleDayAvailability(slug, start, end);
    if (!available) {
      const err = new Error('Cabin is not available for the selected time window');
      err.status = 409;
      throw err;
    }

    const booking = await Booking.create({
      cabin: cabin._id,
      user: user?.userId || null,
      startDate: start,
      endDate: end,
      startDateTime: start,
      endDateTime: end,
      guestName: payload.guestName,
      guestAddress: payload.guestAddress,
      guestPostalCode: payload.guestPostalCode,
      guestCity: payload.guestCity,
      guestPhone: payload.guestPhone,
      guestEmail: payload.guestEmail,
      guestAffiliation: payload.guestAffiliation,
      status: 'pending'
    });

    try {
      const ownerEmail = cabin.email || (await User.findById(cabin.owner))?.email;
      if (ownerEmail) {
        await sendBookingCreatedOwnerEmail(ownerEmail, cabin.name, payload.guestName, start, end, booking.orderNo);
      }
      if (payload.guestEmail) {
        await sendBookingCreatedGuestEmail(payload.guestEmail, payload.guestName, cabin.name, start, end, 'pending');
      }
    } catch (e) {
      console.warn('Booking created email (exact times) failed:', e?.message || e);
    }

    return booking;
  }

  // Check if this is a multi-segment booking
  if (payload.segments && Array.isArray(payload.segments)) {
    // Multi-segment booking logic
    console.log('Multi-segment booking detected:', payload.segments.length, 'segments');

    // Validate availability for each segment first
    for (const seg of payload.segments) {
      const { start, end } = toHalfDayRangeUTC(seg.startDate, seg.endDate, seg.startHalf || 'AM', seg.endHalf || 'PM');
      if (end < now) {
        const err = new Error('Cannot book past dates');
        err.status = 400;
        throw err;
      }
      const { available } = await checkAvailability(slug, seg.startDate, seg.endDate, seg.startHalf, seg.endHalf);
      if (!available) {
        const err = new Error('One or more segments are not available');
        err.status = 409;
        throw err;
      }
    }

    // Create all bookings (Firebase doesn't support transactions like MongoDB)
    try {
      const bookingsToCreate = [];
      for (const seg of payload.segments) {
        const { start, end } = toHalfDayRangeUTC(seg.startDate, seg.endDate, seg.startHalf, seg.endHalf);
        bookingsToCreate.push({
          cabin: cabin._id,
          user: user?.userId || null,
          startDate: new Date(seg.startDate),
          endDate: new Date(seg.endDate),
          startDateTime: start,
          endDateTime: end,
          guestName: payload.guestName,
          guestAddress: payload.guestAddress,
          guestPostalCode: payload.guestPostalCode,
          guestCity: payload.guestCity,
          guestPhone: payload.guestPhone,
          guestEmail: payload.guestEmail,
          guestAffiliation: payload.guestAffiliation,
          status: 'pending'
        });
      }
      
      // Create bookings individually (Firebase doesn't support bulk operations like MongoDB)
      const created = [];
      for (const bookingData of bookingsToCreate) {
        const booking = await Booking.create(bookingData);
        created.push(booking);

        // Notify owner and guest for each segment (non-blocking)
        try {
          const ownerEmail = cabin.email || (await User.findById(cabin.owner))?.email;
          if (ownerEmail) {
            await sendBookingCreatedOwnerEmail(ownerEmail, cabin.name, bookingData.guestName, bookingData.startDate, bookingData.endDate, booking.orderNo);
          }
          if (bookingData.guestEmail) {
            await sendBookingCreatedGuestEmail(bookingData.guestEmail, bookingData.guestName, cabin.name, bookingData.startDate, bookingData.endDate, 'pending');
          }
        } catch (e) {
          console.warn('Booking created email (multi) failed:', e?.message || e);
        }
      }
      
      return created;
    } catch (e) {
      throw e;
    }
  } else {
    // Single booking logic (existing logic for single day or date range)
    let start, end, startDate, endDate;
    
    if (payload.date) {
      // Single day booking
      const { date, half = 'FULL' } = payload;
      const dateObj = new Date(date);
      
      console.log('Single day booking debug:', { date, half, dateObj, startDate, endDate });
      
      if (half === 'AM') {
        // Optional custom times from payload for half-day
        if (payload.startTime && payload.endTime) {
          const [sh, sm] = payload.startTime.split(':').map((v) => parseInt(v, 10));
          const [eh, em] = payload.endTime.split(':').map((v) => parseInt(v, 10));
          start = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), sh, sm, 0, 0));
          end = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), eh, em, 59, 999));
        } else {
          start = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0, 0));
          end = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 11, 59, 59, 999));
        }
      } else if (half === 'PM') {
        if (payload.startTime && payload.endTime) {
          const [sh, sm] = payload.startTime.split(':').map((v) => parseInt(v, 10));
          const [eh, em] = payload.endTime.split(':').map((v) => parseInt(v, 10));
          start = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), sh, sm, 0, 0));
          end = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), eh, em, 59, 999));
        } else {
          start = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 12, 0, 0, 0));
          end = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 23, 59, 59, 999));
        }
      } else {
        // FULL day: use cabin-defined full-day times if provided
        const [fh, fm] = (cabin.fullDayStartTime || '00:00').split(':').map((v) => parseInt(v, 10));
        const [th, tm] = (cabin.fullDayEndTime || '23:59').split(':').map((v) => parseInt(v, 10));
        start = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), fh || 0, fm || 0, 0, 0));
        end = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), th || 23, tm || 59, 59, 999));
      }
      
      // Prevent past-date booking
      if (end < now) {
        const err = new Error('Cannot book past dates');
        err.status = 400;
        throw err;
      }
      
      // Set startDate and endDate to the computed times for database storage
      startDate = start;
      endDate = end;
      
      console.log('Computed start/end times:', { start, end, startISO: start.toISOString(), endISO: end.toISOString() });
      
      // For single day, check availability with the computed start/end times
      const { available } = await checkSingleDayAvailability(slug, start, end);
      if (!available) {
        const err = new Error('Cabin is not available for the selected date');
        err.status = 409;
        throw err;
      }
    } else {
      // Date range booking
      const { startDate: sd, endDate: ed, startHalf = 'AM', endHalf = 'PM' } = payload;
      startDate = new Date(sd);
      endDate = new Date(ed);
      const result = toHalfDayRangeUTC(sd, ed, startHalf, endHalf);
      start = result.start;
      end = result.end;

      // For full-day coverage ranges on full-day cabins, use cabin-defined times
      if (cabin.halfdayAvailability === false && (startHalf === 'AM' && endHalf === 'PM')) {
        const s = new Date(sd);
        const e = new Date(ed);
        const [fh, fm] = (cabin.fullDayStartTime || '00:00').split(':').map((v) => parseInt(v, 10));
        const [th, tm] = (cabin.fullDayEndTime || '23:59').split(':').map((v) => parseInt(v, 10));
        start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), fh || 0, fm || 0, 0, 0));
        end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), th || 23, tm || 59, 59, 999));
      }

      // Prevent past-date booking
      if (end < now) {
        const err = new Error('Cannot book past dates');
        err.status = 400;
        throw err;
      }
      
      // For date range, check availability with the original dates and halves
      const { available } = await checkAvailability(slug, startDate, endDate, startHalf, endHalf);
      if (!available) {
        const err = new Error('Cabin is not available for the selected dates');
        err.status = 409;
        throw err;
      }
    }

    const booking = await Booking.create({
      cabin: cabin._id,
      user: user?.userId || null, // Ensure user ID is set or explicitly null
      startDate: startDate,
      endDate: endDate,
      startDateTime: start,
      endDateTime: end,
      guestName: payload.guestName,
      guestAddress: payload.guestAddress,
      guestPostalCode: payload.guestPostalCode,
      guestCity: payload.guestCity,
      guestPhone: payload.guestPhone,
      guestEmail: payload.guestEmail,
      guestAffiliation: payload.guestAffiliation,
      status: 'pending'
    });
    
    // Notify owner and guest (non-blocking)
    try {
      const ownerEmail = cabin.email || (await User.findById(cabin.owner))?.email;
      if (ownerEmail) {
        await sendBookingCreatedOwnerEmail(ownerEmail, cabin.name, payload.guestName, startDate, endDate, booking.orderNo);
      }
      if (payload.guestEmail) {
        await sendBookingCreatedGuestEmail(payload.guestEmail, payload.guestName, cabin.name, startDate, endDate, 'pending');
      }
    } catch (e) {
      console.warn('Booking created email failed:', e?.message || e);
    }

    return booking;
  }
};

export const createMultiBooking = async (slug, payload, user) => {
  const cabin = await Cabin.findOne({ slug });
  if (!cabin) throw new Error('Cabin not found');

  const now = new Date();

  // Validate availability for each segment first
  for (const seg of payload.segments) {
    const { start, end } = toHalfDayRangeUTC(seg.startDate, seg.endDate, seg.startHalf || 'AM', seg.endHalf || 'PM');
    if (end < now) {
      const err = new Error('Cannot book past dates');
      err.status = 400;
      throw err;
    }
    const { available } = await checkAvailability(slug, seg.startDate, seg.endDate, seg.startHalf, seg.endHalf);
    if (!available) {
      const err = new Error('One or more segments are not available');
      err.status = 409;
      throw err;
    }
  }

  // Create all bookings (Firebase doesn't support transactions like MongoDB)
  try {
    const bookingsToCreate = [];
    for (const seg of payload.segments) {
      let { start, end } = toHalfDayRangeUTC(seg.startDate, seg.endDate, seg.startHalf, seg.endHalf);
      if (cabin.halfdayAvailability === false && ((seg.startHalf || 'AM') === 'AM' && (seg.endHalf || 'PM') === 'PM')) {
        const s = new Date(seg.startDate);
        const e = new Date(seg.endDate);
        const [fh, fm] = (cabin.fullDayStartTime || '00:00').split(':').map((v) => parseInt(v, 10));
        const [th, tm] = (cabin.fullDayEndTime || '23:59').split(':').map((v) => parseInt(v, 10));
        start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), fh || 0, fm || 0, 0, 0));
        end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), th || 23, tm || 59, 59, 999));
      }
      bookingsToCreate.push({
        cabin: cabin._id,
        user: user?.userId || null,
        startDate: new Date(seg.startDate),
        endDate: new Date(seg.endDate),
        startDateTime: start,
        endDateTime: end,
        guestName: payload.guestName,
        guestAddress: payload.guestAddress,
        guestPostalCode: payload.guestPostalCode,
        guestCity: payload.guestCity,
        guestPhone: payload.guestPhone,
        guestEmail: payload.guestEmail,
        guestAffiliation: payload.guestAffiliation,
        status: 'pending'
      });
    }
    
    // Create bookings individually (Firebase doesn't support bulk operations like MongoDB)
    const created = [];
    for (const bookingData of bookingsToCreate) {
      const booking = await Booking.create(bookingData);
      created.push(booking);
    }
    
    return created;
  } catch (e) {
    throw e;
  }
};

export const getBookedDates = async (slug) => {
  const cabin = await Cabin.findOne({ slug });
  if (!cabin) throw new Error('Hytte ikke funnet');
  
  console.log(`🔍 getBookedDates: Ser etter bookinger for hytte ${slug} (ID: ${cabin._id})`);
  
  const [bookings, blocks] = await Promise.all([
    Booking.find({ cabin: cabin._id, status: { $nin: ['cancelled', 'rejected'] } }, { startDate: 1, endDate: 1, status: 1, orderNo: 1, guestName: 1, _id: 0 }),
    Unavailability.find({ cabin: cabin._id }, { startDate: 1, endDate: 1, reason: 1, _id: 0 })
  ]);
  
  console.log(`📋 getBookedDates: Found ${bookings.length} bookings and ${blocks.length} blocks`);
  bookings.forEach((booking, index) => {
    console.log(`📝 getBookedDates Booking ${index + 1}: ${booking.startDate} to ${booking.endDate} by ${booking.guestName}`);
  });
  
  const notes = await getAllNotesForCabin(cabin._id);
  const legendIds = Array.from(new Set(notes.map(n => n.legendId).filter(Boolean)));
  let legendMap = new Map();
  if (legendIds.length > 0) {
    const legends = await Legend.find({ _id: { $in: legendIds } });
    legendMap = new Map(legends.map(l => [String(l._id), l]));
  }
  const legendDates = notes
    .filter(n => n.legendId)
    .map(n => {
      const legend = legendMap.get(String(n.legendId));
      return {
        date: n.date,
        legend: legend ? {
          id: String(legend._id),
          name: legend.name,
          color: legend.color,
          bgColor: legend.bgColor,
          borderColor: legend.borderColor,
          textColor: legend.textColor,
          isBookable: legend.isBookable
        } : { id: String(n.legendId) }
      };
    });
  return {
    bookings: bookings.map(b => ({ startDate: b.startDate, endDate: b.endDate, status: b.status, orderNo: b.orderNo, guestName: b.guestName })),
    blocks: blocks.map(b => ({ startDate: b.startDate, endDate: b.endDate, reason: b.reason })),
    notes,
    legendDates
  };
};

// Enhanced function for calendar display with detailed information
export const getCalendarData = async (slug, year, month) => {
  const cabin = await Cabin.findOne({ slug });
  if (!cabin) throw new Error('Cabin not found');

  console.log(`🏠 Calendar request for cabin: ${slug} (ID: ${cabin._id})`);
  console.log(`📅 Requested period: ${year}-${month}`);

  // Create date range for the requested month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  console.log(`📊 Date range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);

  // Firebase doesn't support $or queries, so we need to fetch all bookings and filter in memory
  const [allBookings, allBlocks] = await Promise.all([
    Booking.find({ 
      cabin: cabin._id, 
      status: { $nin: ['cancelled', 'rejected'] }
    }),
    Unavailability.find({ 
      cabin: cabin._id
    })
  ]);

  console.log(`📋 Found ${allBookings.length} total bookings for cabin ${cabin._id}`);
  console.log(`🚫 Found ${allBlocks.length} total blocks for cabin ${cabin._id}`);

  // Log all bookings for debugging
  allBookings.forEach((booking, index) => {
    console.log(`📝 Booking ${index + 1}: ${booking.startDate} to ${booking.endDate} (Status: ${booking.status})`);
  });

  // Filter bookings that overlap with the requested month
  const bookings = allBookings.filter(booking => {
    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);
    // Check if booking overlaps with the month
    const overlaps = bookingStart <= endOfMonth && bookingEnd >= startOfMonth;
    console.log(`🔍 Booking ${bookingStart.toISOString().split('T')[0]} to ${bookingEnd.toISOString().split('T')[0]} overlaps with month: ${overlaps}`);
    return overlaps;
  });

  // Filter blocks that overlap with the requested month
  const blocks = allBlocks.filter(block => {
    const blockStart = new Date(block.startDate);
    const blockEnd = new Date(block.endDate);
    // Check if block overlaps with the month
    const overlaps = blockStart <= endOfMonth && blockEnd >= startOfMonth;
    console.log(`🚧 Block ${blockStart.toISOString().split('T')[0]} to ${blockEnd.toISOString().split('T')[0]} overlaps with month: ${overlaps}`);
    return overlaps;
  });

  console.log(`✅ Filtered to ${bookings.length} bookings and ${blocks.length} blocks for the requested month`);

  // Helper function to get all dates in a range
  const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Process bookings
  const bookingDates = new Map();
  bookings.forEach(booking => {
    const dates = getDatesInRange(booking.startDate, booking.endDate);
    
    dates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      if (!bookingDates.has(dateKey)) {
        bookingDates.set(dateKey, []);
      }
      
      // Calculate the actual time period for this specific date
      const bookingStart = new Date(booking.startDateTime);
      const bookingEnd = new Date(booking.endDateTime);
      const currentDate = new Date(date);
      
      // Determine start time for this date
      let dayStartTime, dayEndTime;
      
      if (dateKey === bookingStart.toISOString().split('T')[0]) {
        // First day of booking - use actual start time
        dayStartTime = bookingStart;
      } else {
        // Subsequent days - start from beginning of day
        dayStartTime = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 0, 0, 0, 0));
      }
      
      if (dateKey === bookingEnd.toISOString().split('T')[0]) {
        // Last day of booking - use actual end time
        dayEndTime = bookingEnd;
      } else {
        // Earlier days - end at end of day
        dayEndTime = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 23, 59, 59, 999));
      }
      
      bookingDates.get(dateKey).push({
        type: 'booking',
        status: booking.status,
        guestName: booking.guestName,
        startDateTime: dayStartTime,
        endDateTime: dayEndTime
      });
    });
  });

  // Process blocks
  const blockDates = new Map();
  blocks.forEach(block => {
    const dates = getDatesInRange(block.startDate, block.endDate);
    dates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      if (!blockDates.has(dateKey)) {
        blockDates.set(dateKey, []);
      }
      blockDates.get(dateKey).push({
        type: 'block',
        reason: block.reason,
        startDate: block.startDate,
        endDate: block.endDate
      });
    });
  });

  // Combine all dates with their status
  const calendarData = new Map();
  
  // Add booking dates
  bookingDates.forEach((items, date) => {
    calendarData.set(date, {
      date,
      status: 'booked', // Red color
      items: items
    });
  });

  // Add block dates (overrides bookings if same date)
  blockDates.forEach((items, date) => {
    const blockType = items[0].reason?.toLowerCase().includes('maintenance') ? 'maintenance' : 'unavailable';
    calendarData.set(date, {
      date,
      status: blockType, // Yellow for maintenance, gray for unavailable
      items: items
    });
  });

  // Ensure legend-only days are included for coloring
  const notesMap = await getNotesForMonth(cabin._id, year, month);
  Object.keys(notesMap).forEach(dateKey => {
    if (!calendarData.has(dateKey)) {
      calendarData.set(dateKey, { date: dateKey, status: 'available', items: [] });
    }
  });

  // Convert to array and sort by date
  const result = Array.from(calendarData.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Fetch legends referenced in notes for this month
  const legendIds = Array.from(new Set(Object.values(notesMap).map(v => v.legendId).filter(Boolean)));
  let legendMap = new Map();
  if (legendIds.length > 0) {
    const legends = await Legend.find({ _id: { $in: legendIds } });
    legendMap = new Map(legends.map(l => [String(l._id), l]));
  }

  // Attach note and legend details, and compute bookable flag
  result.forEach(day => {
    const entry = notesMap[day.date];
    if (entry && typeof entry.note !== 'undefined') {
      day.note = entry.note;
    }
    if (entry && entry.legendId) {
      const legend = legendMap.get(String(entry.legendId));
      if (legend) {
        day.legend = {
          id: String(legend._id),
          name: legend.name,
          color: legend.color,
          bgColor: legend.bgColor,
          borderColor: legend.borderColor,
          textColor: legend.textColor,
          isBookable: legend.isBookable
        };
      } else {
        day.legend = { id: String(entry.legendId) };
      }
    }
    // Default bookable logic: available unless booked or blocked
    let bookable = day.status !== 'booked' && day.status !== 'maintenance' && day.status !== 'unavailable';
    if (day.legend && day.legend.isBookable === false) {
      bookable = false;
    }
    day.bookable = bookable;
  });

  // Calculate statistics
  const totalDays = new Date(year, month, 0).getDate();
  const bookedDays = result.filter(item => item.status === 'booked').length;
  const maintenanceDays = result.filter(item => item.status === 'maintenance').length;
  const unavailableDays = result.filter(item => item.status === 'unavailable').length;
  const availableDays = totalDays - bookedDays - maintenanceDays - unavailableDays;
  const occupancyRate = totalDays > 0 ? Math.round((bookedDays / totalDays) * 100) : 0;

  return {
    calendar: result,
    stats: {
      totalDays,
      bookedDays,
      availableDays,
      maintenanceDays,
      unavailableDays,
      occupancyRate
    },
    month: {
      year,
      month,
      name: new Date(year, month - 1).toLocaleString('default', { month: 'long' })
    }
  };
};

export const blockDates = async (slug, payload, ownerUser) => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) throw new Error('Cabin not found');
  if (String(cabin.owner) !== String(ownerUser.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  console.log('🏠 Cabin found:', {
    id: cabin._id,
    slug: cabin.slug,
    owner: cabin.owner
  });

  // Handle the case where payload might be wrapped in a 'value' object from validation
  const actualPayload = payload.value || payload;
  const { action = 'block', startDate, endDate, reason, dates, startHalf = 'AM', endHalf = 'PM', date, half = 'FULL' } = actualPayload;

  // Helper function to find and remove blocks for specific dates
  const removeBlocksForDates = async (dateRanges) => {
    const removedBlocks = [];
    for (const range of dateRanges) {
      const { start, end } = range;
      
      console.log('🔍 Searching for blocks:', {
        cabinId: cabin._id,
        cabinSlug: cabin.slug,
        searchRange: { start: start.toISOString(), end: end.toISOString() }
      });
      
      // Instead of using complex $or with range queries, get all blocks for this cabin
      // and filter them in memory to avoid Firestore composite index requirements
      const allBlocks = await Unavailability.find({
        cabin: cabin._id
      });
      
      console.log('📋 Found all blocks for cabin:', allBlocks.length);
      
      // Filter blocks that overlap with the target date range in memory
      const overlappingBlocks = allBlocks.filter(block => {
        const blockStart = new Date(block.startDate);
        const blockEnd = new Date(block.endDate);
        const targetStart = new Date(start);
        const targetEnd = new Date(end);
        
        // Check if ranges overlap: block overlaps if blockStart <= targetEnd && blockEnd >= targetStart
        const overlaps = blockStart <= targetEnd && blockEnd >= targetStart;
        
        console.log('🔍 Checking block overlap:', {
          blockId: block._id,
          blockRange: { start: blockStart.toISOString(), end: blockEnd.toISOString() },
          targetRange: { start: targetStart.toISOString(), end: targetEnd.toISOString() },
          overlaps
        });
        
        return overlaps;
      });
      
      console.log('📋 Found overlapping blocks:', overlappingBlocks.length, overlappingBlocks.map(b => ({
        id: b._id,
        startDate: b.startDate.toISOString ? b.startDate.toISOString() : b.startDate,
        endDate: b.endDate.toISOString ? b.endDate.toISOString() : b.endDate,
        reason: b.reason,
        cabinId: b.cabin
      })));
      
      for (const block of overlappingBlocks) {
         await Unavailability.findByIdAndDelete(block._id);
         removedBlocks.push(block);
       }
    }
    return removedBlocks;
  };

  // Helper function to create date ranges for processing
  const createDateRanges = (payload) => {
    const ranges = [];
    
    if (Array.isArray(payload.dates) && payload.dates.length > 0) {
      // Multiple specific dates
      for (const d of payload.dates) {
        const dateValue = typeof d === 'object' && d.date ? d.date : d;
        const halfValue = typeof d === 'object' && d.half ? d.half : 'FULL';
        const day = new Date(dateValue);
        let dayStart, dayEnd;
        
        if (halfValue === 'AM') {
          dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
          dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 11, 59, 59, 999));
        } else if (halfValue === 'PM') {
          dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0, 0));
          dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
        } else {
          dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
          dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
        }
        
        ranges.push({ start: dayStart, end: dayEnd });
      }
    } else if (payload.date) {
      // Single date
      const day = new Date(payload.date);
      let dayStart, dayEnd;
      
      if (payload.half === 'AM') {
        dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
        dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 11, 59, 59, 999));
      } else if (payload.half === 'PM') {
        dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0, 0));
        dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
      } else {
        dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
        dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));
      }
      
      ranges.push({ start: dayStart, end: dayEnd });
    } else if (payload.startDate && payload.endDate) {
      // Date range
      const { start, end } = toHalfDayRangeUTC(payload.startDate, payload.endDate, payload.startHalf, payload.endHalf);
      ranges.push({ start, end });
    }

    return ranges;
  };

  const dateRanges = createDateRanges(actualPayload);
  
  console.log('blockDates debug:', { 
    action, 
    actualPayload, 
    dateRanges: dateRanges.map(r => ({ 
      start: r.start.toISOString(), 
      end: r.end.toISOString() 
    }))
  });

  if (action === 'unblock') {
    // Remove existing blocks for the specified dates
    const removedBlocks = await removeBlocksForDates(dateRanges);
    return { 
      action: 'unblock', 
      message: `Removed ${removedBlocks.length} block(s)`, 
      removedBlocks 
    };
  } else {
    // Block dates (existing logic)
    const blocks = [];
    
    for (const range of dateRanges) {
      const { start, end } = range;
      
      // Check for overlapping bookings without multi-field inequalities (avoid Firestore composite index)
      const existingBookings = await Booking.find({
        cabin: cabin._id,
        status: { $nin: ['cancelled', 'rejected'] }
      });
      const hasOverlap = existingBookings.some(b =>
        rangesOverlap(start, end, b.startDateTime || b.startDate, b.endDateTime || b.endDate)
      );

      if (hasOverlap) {
        const err = new Error(`Cannot block ${start.toISOString().slice(0,10)} - overlapping existing bookings`);
        err.status = 409;
        throw err;
      }

      blocks.push({ cabin: cabin._id, startDate: start, endDate: end, reason });
    }
    
    const created = await Unavailability.insertMany(blocks);
    return { 
      action: 'block', 
      message: `Created ${created.length} block(s)`, 
      blocks: created 
    };
  }
};

export const cancelBooking = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  // Populate cabin data
  const populatedBooking = await Booking.populate([booking], [{ path: 'cabin', select: 'owner slug', model: 'Cabin' }]);
  const bookingWithCabin = populatedBooking[0];

  // Check if user can cancel this booking
  // Users can cancel their own bookings, owners can cancel any booking for their cabin
  const canCancel = user.userId === String(bookingWithCabin.user) || 
                   (user.role === 'owner' && String(bookingWithCabin.cabin.owner) === String(user.userId));

  if (!canCancel) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // Check if booking is already cancelled
  if (bookingWithCabin.status === 'cancelled') {
    throw new Error('Booking is already cancelled');
  }

  // Check if booking is in the past (only for user cancellations, not owner cancellations)
  if (user.role !== 'owner' && new Date() > bookingWithCabin.startDateTime) {
    throw new Error('Cannot cancel past bookings');
  }

  // Update booking status to cancelled
  const updatedBooking = await Booking.findByIdAndUpdate(bookingWithCabin._id, { 
    status: 'cancelled',
    updatedAt: new Date()
  });
  
  // Notify booker about cancellation (non-blocking)
  try {
    const cabinFull = await Cabin.findById(bookingWithCabin.cabin._id || bookingWithCabin.cabin);
    const toEmail = bookingWithCabin.guestEmail || (await User.findById(bookingWithCabin.user))?.email;
    const guestName = bookingWithCabin.guestName || (await User.findById(bookingWithCabin.user))?.firstName;
    if (toEmail) {
      await sendBookingStatusEmail(toEmail, guestName, cabinFull?.name || 'Hytta', bookingWithCabin.startDate, bookingWithCabin.endDate, 'cancelled');
    }
  } catch (e) {
    console.warn('Cancel booking email failed:', e?.message || e);
  }

  return { message: 'Booking cancelled successfully', booking: updatedBooking };
};

// New function specifically for owners to cancel approved bookings
export const ownerCancelBooking = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  // Populate cabin data
  const populatedBooking = await Booking.populate([booking], [{ path: 'cabin', select: 'owner slug', model: 'Cabin' }]);
  const bookingWithCabin = populatedBooking[0];

  // Check if user is the cabin owner
  const isOwner = user.role === 'owner' && String(bookingWithCabin.cabin.owner) === String(user.userId);

  if (!isOwner) {
    const err = new Error('Forbidden - Only cabin owners can use this endpoint');
    err.status = 403;
    throw err;
  }

  // Check if booking is already cancelled or rejected
  if (bookingWithCabin.status === 'cancelled') {
    throw new Error('Booking is already cancelled');
  }

  if (bookingWithCabin.status === 'rejected') {
    throw new Error('Cannot cancel a rejected booking');
  }

  // Owners can cancel bookings in any status (pending, approved, etc.) and even past bookings
  // This gives owners full control over their cabin bookings

  // Update booking status to cancelled
  const updatedBooking = await Booking.findByIdAndUpdate(bookingWithCabin._id, { 
    status: 'cancelled',
    updatedAt: new Date(),
    cancelledBy: 'owner', // Track who cancelled the booking
    cancelledAt: new Date()
  });

  // Notify booker about owner cancellation (non-blocking)
  try {
    const cabinFull = await Cabin.findById(bookingWithCabin.cabin._id || bookingWithCabin.cabin);
    const toEmail = bookingWithCabin.guestEmail || (await User.findById(bookingWithCabin.user))?.email;
    const guestName = bookingWithCabin.guestName || (await User.findById(bookingWithCabin.user))?.firstName;
    if (toEmail) {
      await sendBookingStatusEmail(toEmail, guestName, cabinFull?.name || 'Hytta', bookingWithCabin.startDate, bookingWithCabin.endDate, 'cancelled');
    }
  } catch (e) {
    console.warn('Owner-cancel booking email failed:', e?.message || e);
  }

  return { 
    message: 'Booking cancelled successfully by owner', 
    booking: updatedBooking,
    previousStatus: bookingWithCabin.status
  };
};

// Add these functions to your existing bookingService.js file

export const getBookingById = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId)
    .populate('cabin', 'name slug owner')
    .populate('user', 'name email');
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Check if user can access this booking
  // Users can see their own bookings, owners can see bookings for their cabins
  const canAccess = user.userId === String(booking.user?._id) || 
                   (user.role === 'owner' && String(booking.cabin.owner) === String(user.userId));

  if (!canAccess) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return booking;
};

export const getUserBookings = async (userId, { limit = 20, page = 1, status }) => {
  const filter = { user: userId };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Booking.find(filter, { sort: { startDate: 1 }, skip, limit: Number(limit) }).then(bookings => 
      Booking.populate(bookings, [{ path: 'cabin', select: 'name slug address city', model: 'Cabin' }])
    ),
    Booking.countDocuments(filter)
  ]);

  return { 
    items, 
    total, 
    page: Number(page), 
    limit: Number(limit),
    hasMore: skip + items.length < total
  };
};

export const getCabinBookings = async (slug, ownerUser, { limit = 20, page = 1, status }) => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) throw new Error('Cabin not found');
  if (String(cabin.owner) !== String(ownerUser.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const filter = { cabin: cabin._id };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Booking.find(filter, { sort: { createdAt: -1 }, skip, limit: Number(limit) }).then(bookings => 
      Booking.populate(bookings, [{ path: 'cabin', select: 'name slug address city', model: 'Cabin' }])
    ),
    Booking.countDocuments(filter)
  ]);

  return { 
    items, 
    total, 
    page: Number(page), 
    limit: Number(limit),
    hasMore: skip + items.length < total
  };
};

export const getOwnerBookings = async (ownerId, { limit = 20, page = 1, status, cabinSlug }) => {
  // First get all cabin IDs for this owner
  const ownerCabinFilter = { owner: ownerId };
  if (cabinSlug) {
    ownerCabinFilter.slug = cabinSlug;
  }
  
  const ownerCabins = await Cabin.find(ownerCabinFilter, { select: { _id: 1 } });
  const cabinIds = ownerCabins.map(cabin => cabin._id);

  const filter = { cabin: { $in: cabinIds } };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Booking.find(filter, { sort: { startDate: 1 }, skip, limit: Number(limit) }).then(bookings => 
      Booking.populate(bookings, [
        { path: 'cabin', select: 'name slug address city', model: 'Cabin' },
        { path: 'user', select: 'name email', model: 'User' }
      ])
    ),
    Booking.countDocuments(filter)
  ]);

  return { 
    items, 
    total, 
    page: Number(page), 
    limit: Number(limit),
    hasMore: skip + items.length < total
  };
};

export const getMyBookings = async (userId, { limit = 20, page = 1, status }) => {
  const filter = { user: userId };
  if (status && status !== 'all') {
    filter.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Booking.find(filter, { sort: { createdAt: -1 }, skip, limit: Number(limit) }).then(bookings => 
      Booking.populate(bookings, [{ path: 'cabin', select: 'name slug address city', model: 'Cabin' }])
    ),
    Booking.countDocuments(filter)
  ]);

  return { 
    items, 
    total, 
    page: Number(page), 
    limit: Number(limit),
    hasMore: skip + items.length < total
  };
};

export const getPendingBookings = async (user, { limit = 20, page = 1, cabinSlug }) => {
  let filter = { status: 'pending' };
  
  if (user.role === 'owner') {
    // Owner can only see pending bookings for their cabins
    const ownerCabinFilter = { owner: user.userId };
    if (cabinSlug) {
      ownerCabinFilter.slug = cabinSlug;
    }
    
    const ownerCabins = await Cabin.find(ownerCabinFilter, { select: { _id: 1 } });
    const cabinIds = ownerCabins.map(cabin => cabin._id);
    filter.cabin = { $in: cabinIds };
  } else if (cabinSlug) {
    // Admin with specific cabin filter
    const cabin = await findCabinBySlugFallback(cabinSlug);
    if (!cabin) throw new Error('Cabin not found');
    filter.cabin = cabin._id;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Booking.find(filter, { sort: { createdAt: -1 }, skip, limit: Number(limit) }).then(bookings => 
      Booking.populate(bookings, [
        { path: 'cabin', select: 'name slug address city', model: 'Cabin' },
        { path: 'user', select: 'firstName lastName email', model: 'User' }
      ])
    ),
    Booking.countDocuments(filter)
  ]);

  return { 
    items, 
    total, 
    page: Number(page), 
    limit: Number(limit),
    hasMore: skip + items.length < total
  };
};

export const getBlocks = async (slug, ownerUser) => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) throw new Error('Cabin not found');
  if (String(cabin.owner) !== String(ownerUser.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const blocks = await Unavailability.find({ cabin: cabin._id }, { sort: { startDate: 1 } });
  return blocks;
};

export const removeBlock = async (slug, blockId, ownerUser) => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) {
    throw new Error('Cabin not found');
  }

  if (String(cabin.owner) !== String(ownerUser.userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const block = await Unavailability.findOne({ _id: blockId, cabin: cabin._id });
  if (!block) {
    throw new Error('Block not found');
  }

  await block.deleteOne();
  return { message: 'Block removed successfully' };
};

export const updateBlock = async (slug, blockId, updates, ownerUser) => {
  const cabin = await findCabinBySlugFallback(slug);
  if (!cabin) {
    throw new Error('Cabin not found');
  }

  if (cabin.owner !== ownerUser.userId) {
    throw new Error('Unauthorized: You can only update blocks for your own cabins');
  }

  const block = await Unavailability.findById(blockId);
  if (!block) {
    throw new Error('Block not found');
  }

  if (block.cabin !== cabin._id) {
    throw new Error('Block does not belong to this cabin');
  }

  // Only allow updating certain fields
  const allowedUpdates = ['startDate', 'endDate', 'reason'];
  const updateData = {};
  
  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updateData[key] = updates[key];
    }
  });

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }

  updateData.updatedAt = new Date();
  const updatedBlock = await Unavailability.findByIdAndUpdate(block._id, updateData);

  return updatedBlock;
};

export const approveBooking = async (bookingId, user, options = {}) => {
  const { sendEmail = true } = options;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  // Populate cabin data
  const populatedBooking = await Booking.populate([booking], [{ path: 'cabin', select: 'owner slug', model: 'Cabin' }]);
  const bookingWithCabin = populatedBooking[0];

  // Check if user can approve this booking (admin or cabin owner)
  const canApprove = user.role === 'admin' || 
                    (user.role === 'owner' && String(bookingWithCabin.cabin.owner) === String(user.userId));

  if (!canApprove) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // Check if booking is pending
  if (bookingWithCabin.status !== 'pending') {
    throw new Error('Only pending bookings can be approved');
  }

  // Update booking status to approved
  const updatedBooking = await Booking.findByIdAndUpdate(bookingWithCabin._id, { 
    status: 'approved',
    updatedAt: new Date()
  }, { new: true });
  
  // Notify booker about approval (non-blocking)
  try {
    const cabinFull = await Cabin.findById(bookingWithCabin.cabin._id || bookingWithCabin.cabin);
    const toEmail = bookingWithCabin.guestEmail || (await User.findById(bookingWithCabin.user))?.email;
    const guestName = bookingWithCabin.guestName || (await User.findById(bookingWithCabin.user))?.firstName;
    if (toEmail && sendEmail) {
      await sendBookingStatusEmail(toEmail, guestName, cabinFull?.name || 'Hytta', bookingWithCabin.startDate, bookingWithCabin.endDate, 'approved');
    }
  } catch (e) {
    console.warn('Approve booking email failed:', e?.message || e);
  }

  return { message: 'Booking approved successfully', booking: updatedBooking };
};

export const rejectBooking = async (bookingId, user, options = {}) => {
  const { sendEmail = true } = options;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  // Populate cabin data
  const populatedBooking = await Booking.populate([booking], [{ path: 'cabin', select: 'owner slug', model: 'Cabin' }]);
  const bookingWithCabin = populatedBooking[0];

  // Check if user can reject this booking (admin or cabin owner)
  const canReject = user.role === 'admin' || 
                   (user.role === 'owner' && String(bookingWithCabin.cabin.owner) === String(user.userId));

  if (!canReject) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  // Check if booking is pending
  if (bookingWithCabin.status !== 'pending') {
    throw new Error('Only pending bookings can be rejected');
  }

  // Update booking status to rejected
  const updatedBooking = await Booking.findByIdAndUpdate(bookingWithCabin._id, { 
    status: 'rejected',
    updatedAt: new Date()
  }, { new: true });
  
  // Notify booker about rejection (non-blocking)
  try {
    const cabinFull = await Cabin.findById(bookingWithCabin.cabin._id || bookingWithCabin.cabin);
    const toEmail = bookingWithCabin.guestEmail || (await User.findById(bookingWithCabin.user))?.email;
    const guestName = bookingWithCabin.guestName || (await User.findById(bookingWithCabin.user))?.firstName;
    if (toEmail && sendEmail) {
      await sendBookingStatusEmail(toEmail, guestName, cabinFull?.name || 'Hytta', bookingWithCabin.startDate, bookingWithCabin.endDate, 'rejected');
    }
  } catch (e) {
    console.warn('Reject booking email failed:', e?.message || e);
  }

  return { message: 'Booking rejected successfully', booking: updatedBooking };
};
