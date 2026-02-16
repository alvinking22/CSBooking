const express = require('express');
const router = express.Router();
const {
  getAllBookings,
  getBookingById,
  getBookingByNumber,
  createBooking,
  updateBooking,
  cancelBooking,
  confirmBooking,
  checkAvailabilityEndpoint,
  getCalendarBookings,
  getDashboardStats
} = require('../controllers/bookingController');
const { auth, authorize } = require('../middleware/auth');

// Public routes
router.post('/', createBooking);
router.post('/check-availability', checkAvailabilityEndpoint);
router.get('/calendar', getCalendarBookings);
router.get('/number/:bookingNumber', getBookingByNumber);

// Protected routes (Admin only)
router.get('/', auth, authorize('admin'), getAllBookings);
router.get('/stats/dashboard', auth, authorize('admin'), getDashboardStats);
router.get('/:id', auth, authorize('admin'), getBookingById);
router.put('/:id', auth, authorize('admin'), updateBooking);
router.put('/:id/cancel', auth, authorize('admin'), cancelBooking);
router.put('/:id/confirm', auth, authorize('admin'), confirmBooking);

module.exports = router;
