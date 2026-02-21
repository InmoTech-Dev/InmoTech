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
  tipo_doc_vendedor: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'tipo_doc_vendedor'
  },
  numero_doc_vendedor: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'numero_doc_vendedor'
  },
  nombre_vendedor: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'nombre_vendedor'
  },
  correo_vendedor: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'correo_vendedor'
  },
  telefono_vendedor: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'telefono_vendedor'
  },
  id_estado_venta: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'id_estado_venta'
  },
  estado_seguimiento: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'estado_seguimiento'
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
