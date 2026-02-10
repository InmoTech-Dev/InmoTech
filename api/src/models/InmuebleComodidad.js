const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InmuebleComodidad = sequelize.define('Inmueble_Comodidades', {
  id_inmueble_comodidad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_inmueble_comodidad'
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_comodidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  seleccionada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Inmueble_Comodidades',
  timestamps: false
});

module.exports = InmuebleComodidad;
