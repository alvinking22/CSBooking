const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
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
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'transfer', 'card', 'azul', 'other'),
    allowNull: false
  },
  paymentType: {
    type: DataTypes.ENUM('deposit', 'full', 'partial', 'refund'),
    allowNull: false,
    defaultValue: 'full'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'completed'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID de transacción de Azul o banco'
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Referencia de pago'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuario admin que procesó el pago'
  },
  paymentDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    {
      fields: ['bookingId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['paymentDate']
    }
  ]
});

module.exports = Payment;
