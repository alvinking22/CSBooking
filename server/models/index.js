const { sequelize } = require('../config/database');
const User = require('./User');
const BusinessConfig = require('./BusinessConfig');
const Equipment = require('./Equipment');
const Booking = require('./Booking');
const BookingEquipment = require('./BookingEquipment');
const Payment = require('./Payment');
const ServiceType = require('./ServiceType');

// Definir relaciones

// ServiceType - Booking (One to Many)
ServiceType.hasMany(Booking, {
  foreignKey: 'serviceTypeId',
  as: 'bookings'
});

Booking.belongsTo(ServiceType, {
  foreignKey: 'serviceTypeId',
  as: 'serviceType'
});

// Booking - Equipment (Many to Many)
Booking.belongsToMany(Equipment, {
  through: BookingEquipment,
  foreignKey: 'bookingId',
  otherKey: 'equipmentId',
  as: 'equipment'
});

Equipment.belongsToMany(Booking, {
  through: BookingEquipment,
  foreignKey: 'equipmentId',
  otherKey: 'bookingId',
  as: 'bookings'
});

// Booking - BookingEquipment (directo para acceso)
Booking.hasMany(BookingEquipment, {
  foreignKey: 'bookingId',
  as: 'bookingEquipment'
});

BookingEquipment.belongsTo(Booking, {
  foreignKey: 'bookingId'
});

BookingEquipment.belongsTo(Equipment, {
  foreignKey: 'equipmentId'
});

// Booking - Payment (One to Many)
Booking.hasMany(Payment, {
  foreignKey: 'bookingId',
  as: 'payments'
});

Payment.belongsTo(Booking, {
  foreignKey: 'bookingId'
});

// User - Payment (quien procesó el pago)
User.hasMany(Payment, {
  foreignKey: 'processedBy',
  as: 'processedPayments'
});

Payment.belongsTo(User, {
  foreignKey: 'processedBy',
  as: 'processor'
});

// Sincronización de base de datos
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  BusinessConfig,
  Equipment,
  Booking,
  BookingEquipment,
  Payment,
  ServiceType,
  syncDatabase
};
