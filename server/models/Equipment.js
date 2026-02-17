const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Equipment = sequelize.define('Equipment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre del equipo (ej: Micrófono Shure SM7B)'
  },
  category: {
    type: DataTypes.ENUM(
      'cameras',
      'microphones', 
      'lights',
      'backgrounds',
      'audio',
      'accessories',
      'furniture',
      'other'
    ),
    allowNull: false,
    defaultValue: 'other'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL o path de la imagen del equipo'
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Cantidad disponible'
  },
  isIncluded: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si está incluido gratis en la reserva'
  },
  extraCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Costo adicional si no está incluido'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si está disponible para selección'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Orden de visualización'
  },
  specifications: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Especificaciones técnicas adicionales'
  },
  allowQuantitySelection: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si el cliente puede seleccionar la cantidad'
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Variantes/opciones del equipo con fotos y costos'
  }
}, {
  tableName: 'equipment',
  timestamps: true,
  indexes: [
    {
      fields: ['category']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = Equipment;
