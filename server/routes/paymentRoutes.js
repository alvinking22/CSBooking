const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentsByBooking,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats
} = require('../controllers/paymentController');
const { auth, authorize } = require('../middleware/auth');

// All payment routes are protected (Admin only)
router.use(auth);
router.use(authorize('admin'));

router.get('/', getAllPayments);
router.get('/stats', getPaymentStats);
router.get('/booking/:bookingId', getPaymentsByBooking);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
