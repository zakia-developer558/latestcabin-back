import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { create, list, getBySlug, update, remove, listMyCabins, getCabinsByOwnerSlug, getCabinsByCompanySlug } from '../controllers/cabinController.js';
import { assertCabinOwner } from '../middleware/ownershipMiddleware.js';
import { availability, book, bookMulti, bookedDates, calendarData, block, cancel, getBookingDetails, getMyBookings, updateBooking, getOwnerAllBookings, getCabinAllBookings, updateBookingStatusController, getCabinBlocks, updateBlockController, removeBlockController, approveBookingController, rejectBookingController, getPendingBookingsController } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/create', authenticate, authorize('owner'), create);
router.get('/', list);
router.get('/owner/:ownerSlug/cabins', getCabinsByOwnerSlug);
router.get('/company/:companySlug/cabins', getCabinsByCompanySlug);
router.get('/:slug', getBySlug);
router.get('/:slug/availability', availability);
router.post('/:slug/book', book);
router.post('/:slug/book-multi', bookMulti);
router.get('/:slug/booked-dates', bookedDates);
router.get('/:slug/calendar', calendarData);
router.post('/:slug/block', authenticate, authorize('owner'), assertCabinOwner, block);
router.put('/update/:slug', authenticate, authorize('owner'), assertCabinOwner, update);
router.delete('/delete/:slug', authenticate, authorize('owner'), assertCabinOwner, remove);
router.delete('/bookings/:bookingId/cancel', cancel);

// Get specific booking details (accessible by booking owner or cabin owner)
router.get('/bookings/:bookingId', authenticate, getBookingDetails);

// Get user's own bookings
router.get('/user/my-bookings', authenticate, getMyBookings);

// Update booking details (guest information only)
router.put('/bookings/:bookingId', authenticate, updateBooking);

// Get all bookings for all owner's cabins
router.get('/owner/bookings', authenticate, authorize('owner'), getOwnerAllBookings);

// Get bookings for specific cabin
router.get('/:slug/bookings', authenticate, authorize('owner'), assertCabinOwner, getCabinAllBookings);

// Update booking status (owner only - confirm/cancel bookings)
router.put('/bookings/:bookingId/status', authenticate, authorize('owner'), updateBookingStatusController);

// Get all blocked dates for a cabin
router.get('/:slug/blocks', authenticate, authorize('owner'), assertCabinOwner, getCabinBlocks);

// Update a specific block
router.put('/:slug/blocks/:blockId', authenticate, authorize('owner'), assertCabinOwner, updateBlockController);

// Remove a specific block
router.delete('/:slug/blocks/:blockId', authenticate, authorize('owner'), assertCabinOwner, removeBlockController);

// Admin approval/rejection routes
router.get('/admin/pending-bookings', authenticate, getPendingBookingsController);
router.put('/admin/bookings/:bookingId/approve', authenticate, approveBookingController);
router.put('/admin/bookings/:bookingId/reject', authenticate, rejectBookingController);

router.get('/get/owner-cabins',authenticate, listMyCabins);

export default router;


