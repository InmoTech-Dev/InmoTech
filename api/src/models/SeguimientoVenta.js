const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SeguimientoVenta = sequelize.define(
  'SeguimientoVenta',
  {
    id_seguimiento_venta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_seguimiento_venta',
    },
    id_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_venta',
    },
    id_estado_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_estado_venta',
    },
    id_persona: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_persona',
    },
    fecha_estado_seguimiento: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_estado_seguimiento',
    },
    descripcion: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'descripcion',
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_creacion',
    },
  },
  {
    tableName: 'Seguimiento_venta',
    timestamps: false,
  }
);

module.exports = SeguimientoVenta;
