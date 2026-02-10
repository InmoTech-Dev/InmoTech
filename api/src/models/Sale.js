const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sale = sequelize.define('Sale', {
  id_venta: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_venta'
  },
  id_comprador: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_comprador'
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_inmueble'
  },
  fecha_venta: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fecha_venta'
  },
  valor_venta: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'valor_venta'
  },
  medio_pago: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'medio_pago'
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Activa',
    field: 'estado'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'Ventas',
  timestamps: false
});

module.exports = Sale;
