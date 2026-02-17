const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EstadosVenta = sequelize.define(
  'EstadosVenta',
  {
    id_estado_venta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_estado_venta',
    },
    nombre_estado: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'nombre_estado',
    },
    descripcion: {
      type: DataTypes.STRING(255),
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
    tableName: 'EstadosVenta',
    timestamps: false,
  }
);

module.exports = EstadosVenta;
