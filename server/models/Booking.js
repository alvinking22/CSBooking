const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  bookingNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    comment: 'Número de reserva único (ej: BK-20240215-001)'
  },
  // Información del cliente
  clientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  clientPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Fecha y hora de la sesión
  sessionDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  duration: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    comment: 'Duración en horas'
  },
  // Tipo de servicio (nuevo - reemplaza contentType)
  serviceTypeId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Referencia al tipo de servicio seleccionado'
  },
  // Tipo de contenido (legacy - se mantiene para compatibilidad)
  contentType: {
    type: DataTypes.ENUM('podcast', 'youtube', 'social_media', 'interview', 'other'),
    allowNull: true,
    defaultValue: 'other'
  },
  projectDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descripción del proyecto a grabar'
  },
  // Precios
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Precio base por las horas'
  },
  equipmentCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Costo adicional por equipos extras'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Precio total de la reserva'
  },
  // Estado de la reserva
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no_show'),
    defaultValue: 'pending'
  },
  // Información de pago
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'deposit_paid', 'paid', 'refunded'),
    defaultValue: 'pending'
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'transfer', 'card', 'azul', 'other'),
    allowNull: true
  },
  // Notas
  clientNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas del cliente sobre requerimientos especiales'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas internas del administrador'
  },
  // Confirmaciones y notificaciones
  confirmationSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Cancelación
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.ENUM('client', 'admin'),
    allowNull: true
  }
}, {
  tableName: 'bookings',
  timestamps: true,
  indexes: [
    {
      fields: ['sessionDate']
    },
    {
      fields: ['status']
    },
    {
      fields: ['paymentStatus']
    },
    {
      fields: ['clientEmail']
    },
    {
      fields: ['bookingNumber']
    }
  ]
});

// Hook para generar booking number antes de crear
Booking.beforeCreate(async (booking) => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // Contar reservas del día actual usando un rango de fechas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await Booking.count({
    where: {
      createdAt: {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      }
    }
  });

  booking.bookingNumber = `CS-${date}-${String(count + 1).padStart(3, '0')}`;
});

module.exports = Booking;
