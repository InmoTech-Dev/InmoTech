const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Comodidad = sequelize.define('Comodidades', {
  id_comodidad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_comodidad'
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  tipo_inmueble: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  es_personalizada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  id_persona_creador: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Comodidades',
  timestamps: false
});

module.exports = Comodidad;
