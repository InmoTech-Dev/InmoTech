const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PropiedadInmueble = sequelize.define('Propiedad_inmueble', {
  id_propiedad_inmueble: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_propiedad_inmueble'
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Inmuebles',
      key: 'id_inmueble'
    }
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_final: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Activo'
  },
  porcentaje_propiedad: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 100.0
  },
  es_propietario_actual: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Propiedad_inmueble',
  timestamps: false
});

module.exports = PropiedadInmueble;
