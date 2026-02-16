const { Payment, Booking, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
exports.getAllPayments = async (req, res, next) => {
  try {
    const { bookingId, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where = {};
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.paymentDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Booking,
          attributes: ['id', 'bookingNumber', 'clientName', 'sessionDate']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['paymentDate', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: { payments }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payments for a booking
// @route   GET /api/payments/booking/:bookingId
// @access  Private/Admin
exports.getPaymentsByBooking = async (req, res, next) => {
  try {
    const payments = await Payment.findAll({
      where: { bookingId: req.params.bookingId },
      include: [
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['paymentDate', 'DESC']]
    });

    res.json({
      success: true,
      count: payments.length,
      data: { payments }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a payment
// @route   POST /api/payments
// @access  Private/Admin
exports.createPayment = async (req, res, next) => {
  try {
    const {
      bookingId,
      amount,
      paymentMethod,
      paymentType,
      transactionId,
      reference,
      notes
    } = req.body;

    // Verify booking exists
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Create payment
    const payment = await Payment.create({
      bookingId,
      amount,
      paymentMethod,
      paymentType,
      transactionId,
      reference,
      notes,
      status: 'completed',
      processedBy: req.user.id,
      paymentDate: new Date()
    });

    // Update booking payment status
    const newPaidAmount = parseFloat(booking.paidAmount) + parseFloat(amount);
    const remainingAmount = parseFloat(booking.totalPrice) - newPaidAmount;

    let paymentStatus = 'pending';
    if (remainingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'deposit_paid';
    }

    await booking.update({
      paidAmount: newPaidAmount,
      remainingAmount: Math.max(0, remainingAmount),
      paymentStatus
    });

    // Fetch payment with relations
    const createdPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: Booking,
          attributes: ['id', 'bookingNumber', 'clientName']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment: createdPayment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private/Admin
exports.updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const oldAmount = parseFloat(payment.amount);
    const newAmount = req.body.amount ? parseFloat(req.body.amount) : oldAmount;

    await payment.update(req.body);

    // Update booking if amount changed
    if (oldAmount !== newAmount) {
      const booking = await Booking.findByPk(payment.bookingId);
      const amountDifference = newAmount - oldAmount;
      const newPaidAmount = parseFloat(booking.paidAmount) + amountDifference;
      const remainingAmount = parseFloat(booking.totalPrice) - newPaidAmount;

      let paymentStatus = 'pending';
      if (remainingAmount <= 0) {
        paymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'deposit_paid';
      }

      await booking.update({
        paidAmount: newPaidAmount,
        remainingAmount: Math.max(0, remainingAmount),
        paymentStatus
      });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private/Admin
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update booking payment status
    const booking = await Booking.findByPk(payment.bookingId);
    const newPaidAmount = parseFloat(booking.paidAmount) - parseFloat(payment.amount);
    const remainingAmount = parseFloat(booking.totalPrice) - newPaidAmount;

    let paymentStatus = 'pending';
    if (remainingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'deposit_paid';
    }

    await booking.update({
      paidAmount: Math.max(0, newPaidAmount),
      remainingAmount: Math.max(0, remainingAmount),
      paymentStatus
    });

    await payment.destroy();

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private/Admin
exports.getPaymentStats = async (req, res, next) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Total revenue
    const totalRevenue = await Payment.sum('amount', {
      where: { status: 'completed' }
    });

    // This month revenue
    const monthRevenue = await Payment.sum('amount', {
      where: {
        status: 'completed',
        paymentDate: {
          [Op.gte]: thisMonth,
          [Op.lt]: nextMonth
        }
      }
    });

    // Pending payments
    const pendingPayments = await Payment.count({
      where: { status: 'pending' }
    });

    // Payment methods breakdown
    const methodBreakdown = await Payment.findAll({
      attributes: [
        'paymentMethod',
        [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
      ],
      where: { status: 'completed' },
      group: ['paymentMethod']
    });

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue || 0,
        monthRevenue: monthRevenue || 0,
        pendingPayments,
        methodBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
