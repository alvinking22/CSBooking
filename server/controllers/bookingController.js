const { Booking, Equipment, BookingEquipment, Payment, BusinessConfig, ServiceType } = require('../models');
const { Op } = require('sequelize');
const { sendBookingConfirmation, sendBookingReminder, sendBookingCancellation } = require('../utils/emailService');

// Helper function to check availability
const checkAvailability = async (sessionDate, startTime, endTime, excludeBookingId = null) => {
  const where = {
    sessionDate,
    status: { [Op.not]: 'cancelled' },
    [Op.or]: [
      {
        [Op.and]: [
          { startTime: { [Op.lte]: startTime } },
          { endTime: { [Op.gt]: startTime } }
        ]
      },
      {
        [Op.and]: [
          { startTime: { [Op.lt]: endTime } },
          { endTime: { [Op.gte]: endTime } }
        ]
      },
      {
        [Op.and]: [
          { startTime: { [Op.gte]: startTime } },
          { endTime: { [Op.lte]: endTime } }
        ]
      }
    ]
  };

  if (excludeBookingId) {
    where.id = { [Op.ne]: excludeBookingId };
  }

  const conflictingBookings = await Booking.count({ where });
  return conflictingBookings === 0;
};

// Helper function to calculate price
const calculatePrice = async (duration, equipmentIds = [], serviceTypeId = null) => {
  const config = await BusinessConfig.findOne();
  let basePrice;

  if (serviceTypeId) {
    // Precio viene del ServiceType seleccionado
    const serviceType = await ServiceType.findByPk(serviceTypeId);
    basePrice = serviceType ? parseFloat(serviceType.basePrice) : parseFloat(config.hourlyRate) * parseFloat(duration);
  } else {
    basePrice = parseFloat(config.hourlyRate) * parseFloat(duration);
  }

  let equipmentCost = 0;

  if (equipmentIds.length > 0) {
    const equipment = await Equipment.findAll({
      where: {
        id: equipmentIds,
        isActive: true
      }
    });

    equipmentCost = equipment.reduce((sum, item) => {
      return sum + (item.isIncluded ? 0 : parseFloat(item.extraCost));
    }, 0);
  }

  const totalPrice = basePrice + equipmentCost;
  const depositAmount = config.requireDeposit
    ? config.depositType === 'percentage'
      ? (totalPrice * parseFloat(config.depositAmount)) / 100
      : parseFloat(config.depositAmount)
    : 0;

  return {
    basePrice,
    equipmentCost,
    totalPrice,
    depositAmount,
    remainingAmount: totalPrice - depositAmount
  };
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res, next) => {
  try {
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      clientEmail,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (clientEmail) where.clientEmail = { [Op.iLike]: `%${clientEmail}%` };
    if (startDate && endDate) {
      where.sessionDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.sessionDate = { [Op.gte]: startDate };
    } else if (endDate) {
      where.sessionDate = { [Op.lte]: endDate };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: [
        {
          model: Equipment,
          as: 'equipment',
          through: { attributes: ['quantity', 'cost'] }
        },
        {
          model: Payment,
          as: 'payments'
        }
      ],
      order: [['sessionDate', 'DESC'], ['startTime', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private/Admin or Public with booking number
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          through: { attributes: ['quantity', 'cost', 'selectedOption'] }
        },
        {
          model: Payment,
          as: 'payments'
        },
        {
          model: ServiceType,
          as: 'serviceType',
          required: false
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking by booking number (for clients)
// @route   GET /api/bookings/number/:bookingNumber
// @access  Public
exports.getBookingByNumber = async (req, res, next) => {
  try {
    const { email } = req.query; // Require email for verification

    const booking = await Booking.findOne({
      where: {
        bookingNumber: req.params.bookingNumber,
        ...(email && { clientEmail: email })
      },
      include: [
        {
          model: Equipment,
          as: 'equipment',
          through: { attributes: ['quantity', 'cost', 'selectedOption'] }
        },
        {
          model: ServiceType,
          as: 'serviceType',
          required: false
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
exports.createBooking = async (req, res, next) => {
  try {
    const {
      clientName,
      clientEmail,
      clientPhone,
      sessionDate,
      startTime,
      endTime,
      duration: durationInput,
      contentType,
      serviceTypeId,
      projectDescription,
      equipmentIds,
      clientNotes,
      equipmentDetails // [{equipmentId, quantity, selectedOption}]
    } = req.body;

    // Determinar duración: si hay serviceTypeId, usar la del servicio
    let duration = durationInput;
    let serviceType = null;
    if (serviceTypeId) {
      serviceType = await ServiceType.findByPk(serviceTypeId);
      if (!serviceType || !serviceType.isActive) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de servicio seleccionado no está disponible'
        });
      }
      duration = serviceType.duration;
    }

    // Check availability
    const isAvailable = await checkAvailability(sessionDate, startTime, endTime);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'The selected time slot is not available'
      });
    }

    // Calculate pricing
    const prices = await calculatePrice(duration, equipmentIds || [], serviceTypeId);

    // Generate booking number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayCount = await Booking.count({
      where: {
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: tomorrowStart
        }
      }
    });
    const bookingNumber = `CS-${dateStr}-${String(dayCount + 1).padStart(3, '0')}`;

    // Create booking
    const booking = await Booking.create({
      bookingNumber,
      clientName,
      clientEmail,
      clientPhone,
      sessionDate,
      startTime,
      endTime,
      duration,
      contentType: contentType || 'other',
      serviceTypeId: serviceTypeId || null,
      projectDescription,
      clientNotes,
      basePrice: prices.basePrice,
      equipmentCost: prices.equipmentCost,
      totalPrice: prices.totalPrice,
      depositAmount: prices.depositAmount,
      remainingAmount: prices.remainingAmount,
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Add equipment to booking
    const eqIds = equipmentIds && equipmentIds.length > 0 ? equipmentIds : [];
    if (eqIds.length > 0) {
      const equipment = await Equipment.findAll({
        where: {
          id: eqIds,
          isActive: true
        }
      });

      const bookingEquipmentData = equipment.map(item => {
        const detail = equipmentDetails ? equipmentDetails.find(d => d.equipmentId === item.id) : null;
        return {
          bookingId: booking.id,
          equipmentId: item.id,
          quantity: detail?.quantity || 1,
          selectedOption: detail?.selectedOption || null,
          cost: item.isIncluded ? 0 : parseFloat(item.extraCost)
        };
      });

      await BookingEquipment.bulkCreate(bookingEquipmentData);
    }

    // Send confirmation email
    const config = await BusinessConfig.findOne();
    if (config.sendConfirmationEmail) {
      await sendBookingConfirmation(booking, config);
      await booking.update({ confirmationSentAt: new Date() });
    }

    // Fetch booking with equipment and service type
    const createdBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          through: { attributes: ['quantity', 'cost', 'selectedOption'] }
        },
        {
          model: ServiceType,
          as: 'serviceType',
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking: createdBooking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private/Admin
exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const {
      sessionDate,
      startTime,
      endTime,
      duration,
      status,
      paymentStatus,
      adminNotes,
      equipmentIds
    } = req.body;

    // Check availability if time is being changed
    if (sessionDate && startTime && endTime) {
      const isAvailable = await checkAvailability(
        sessionDate,
        startTime,
        endTime,
        booking.id
      );
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'The selected time slot is not available'
        });
      }
    }

    // Update booking
    const updateData = {};
    if (sessionDate) updateData.sessionDate = sessionDate;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (duration) updateData.duration = duration;
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    await booking.update(updateData);

    // Update equipment if provided
    if (equipmentIds) {
      await BookingEquipment.destroy({ where: { bookingId: booking.id } });
      
      const equipment = await Equipment.findAll({
        where: {
          id: equipmentIds,
          isActive: true
        }
      });

      const bookingEquipment = equipment.map(item => ({
        bookingId: booking.id,
        equipmentId: item.id,
        quantity: 1,
        cost: item.isIncluded ? 0 : parseFloat(item.extraCost)
      }));

      await BookingEquipment.bulkCreate(bookingEquipment);

      // Recalculate prices
      const prices = await calculatePrice(booking.duration, equipmentIds);
      await booking.update({
        basePrice: prices.basePrice,
        equipmentCost: prices.equipmentCost,
        totalPrice: prices.totalPrice
      });
    }

    // Fetch updated booking
    const updatedBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          through: { attributes: ['quantity', 'cost'] }
        }
      ]
    });

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: { booking: updatedBooking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private/Admin or Public with verification
exports.cancelBooking = async (req, res, next) => {
  try {
    const { reason, cancelledBy = 'admin' } = req.body;

    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    await booking.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
      cancelledBy
    });

    // Send cancellation email
    const config = await BusinessConfig.findOne();
    await sendBookingCancellation(booking, config, reason);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm booking
// @route   PUT /api/bookings/:id/confirm
// @access  Private/Admin
exports.confirmBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.update({ status: 'confirmed' });

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check availability
// @route   POST /api/bookings/check-availability
// @access  Public
exports.checkAvailabilityEndpoint = async (req, res, next) => {
  try {
    const { sessionDate, startTime, endTime } = req.body;

    const isAvailable = await checkAvailability(sessionDate, startTime, endTime);

    res.json({
      success: true,
      data: { available: isAvailable }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for calendar
// @route   GET /api/bookings/calendar
// @access  Public (shows only occupied slots)
exports.getCalendarBookings = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {
      status: { [Op.not]: 'cancelled' }
    };

    if (startDate && endDate) {
      where.sessionDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const bookings = await Booking.findAll({
      where,
      attributes: ['id', 'sessionDate', 'startTime', 'endTime', 'status'],
      order: [['sessionDate', 'ASC'], ['startTime', 'ASC']]
    });

    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/bookings/stats/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Total bookings
    const totalBookings = await Booking.count();

    // This month bookings
    const thisMonthBookings = await Booking.count({
      where: {
        sessionDate: {
          [Op.gte]: thisMonth,
          [Op.lt]: nextMonth
        }
      }
    });

    // Pending bookings
    const pendingBookings = await Booking.count({
      where: { status: 'pending' }
    });

    // Revenue this month
    const revenueData = await Booking.sum('totalPrice', {
      where: {
        sessionDate: {
          [Op.gte]: thisMonth,
          [Op.lt]: nextMonth
        },
        status: { [Op.not]: 'cancelled' }
      }
    });

    // Upcoming bookings
    const upcomingBookings = await Booking.findAll({
      where: {
        sessionDate: { [Op.gte]: today },
        status: { [Op.in]: ['pending', 'confirmed'] }
      },
      include: [
        {
          model: Equipment,
          as: 'equipment',
          through: { attributes: [] }
        }
      ],
      order: [['sessionDate', 'ASC'], ['startTime', 'ASC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        totalBookings,
        thisMonthBookings,
        pendingBookings,
        monthlyRevenue: revenueData || 0,
        upcomingBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
