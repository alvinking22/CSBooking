const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingEquipment = sequelize.define('BookingEquipment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  equipmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'equipment',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Cantidad de este equipo para esta reserva'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Costo de este equipo en esta reserva'
  }
}, {
  tableName: 'booking_equipment',
  timestamps: true
});

module.exports = BookingEquipment;
