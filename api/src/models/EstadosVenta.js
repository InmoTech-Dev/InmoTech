const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EstadosVenta = sequelize.define(
  'EstadosVenta',
  {
    id_estado_venta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_estado_venta'
    },
    nombre_estado: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'nombre_estado'
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'descripcion'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'orden'
    },
    es_estado_final: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'es_estado_final'
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'estado'
    }
  },
  {
    tableName: 'Estados_venta',
    timestamps: false
  }
);

module.exports = EstadosVenta;
