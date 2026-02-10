const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServicioCita = sequelize.define('Servicios_cita', {
  id_servicio: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_servicio'
  },
  nombre_servicio: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  duracion_estimada: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 45,
    comment: 'Duración en minutos'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Servicios_cita',
  timestamps: false
});

module.exports = ServicioCita;
