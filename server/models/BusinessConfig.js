const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BusinessConfig = sequelize.define('BusinessConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Información básica
  businessName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'CS Booking'
  },
  logo: {
    type: DataTypes.STRING, // URL o path del logo
    allowNull: true
  },
  primaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6' // Azul por defecto
  },
  secondaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#1E40AF'
  },
  // Información de contacto
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Redes sociales
  instagram: {
    type: DataTypes.STRING,
    allowNull: true
  },
  facebook: {
    type: DataTypes.STRING,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Horarios de operación (JSON)
  operatingHours: {
    type: DataTypes.JSON,
    defaultValue: {
      monday: { enabled: true, open: '09:00', close: '18:00' },
      tuesday: { enabled: true, open: '09:00', close: '18:00' },
      wednesday: { enabled: true, open: '09:00', close: '18:00' },
      thursday: { enabled: true, open: '09:00', close: '18:00' },
      friday: { enabled: true, open: '09:00', close: '18:00' },
      saturday: { enabled: false, open: '10:00', close: '14:00' },
      sunday: { enabled: false, open: '10:00', close: '14:00' }
    }
  },
  // Configuración de reservas
  minSessionDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // horas
    comment: 'Duración mínima de sesión en horas'
  },
  maxSessionDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 8, // horas
    comment: 'Duración máxima de sesión en horas'
  },
  bufferTime: {
    type: DataTypes.INTEGER,
    defaultValue: 30, // minutos
    comment: 'Tiempo de preparación entre sesiones en minutos'
  },
  // Precios
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 50.00,
    comment: 'Precio por hora en USD/DOP'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  },
  // Paquetes de precios (JSON)
  packages: {
    type: DataTypes.JSON,
    defaultValue: []
    // Ejemplo: [{ name: '4 Horas', hours: 4, price: 180, discount: 10 }]
  },
  // Depósito/Señal
  requireDeposit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  depositType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage'
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 50.00,
    comment: 'Porcentaje (50 = 50%) o monto fijo'
  },
  // Configuración de emails
  sendConfirmationEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sendReminderEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reminderHoursBefore: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  },
  // Términos y condiciones
  termsAndConditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellationPolicy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Azul Payment Gateway
  azulEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  azulMerchantId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  azulAuthKey: {
    type: DataTypes.STRING,
    allowNull: true
  },
  azulMode: {
    type: DataTypes.ENUM('sandbox', 'production'),
    defaultValue: 'sandbox'
  },
  // Wizard completado
  setupCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'business_config',
  timestamps: true
});

module.exports = BusinessConfig;
