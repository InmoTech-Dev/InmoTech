const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Payment = require('./Payment');

const Receipt = sequelize.define('Receipt', {
  id_comprobante: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_comprobante'
  },
  id_cobro: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_cobro',
    references: {
      model: 'Cobros',
      key: 'id_cobro'
    }
  },
  url_comprobante: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'url_comprobante'
  },
  entidad_bancaria: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'entidad_bancaria'
  },
  referencia_bancaria: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'referencia_bancaria'
  },
  monto_pagado: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'monto_pagado'
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pendiente',
    field: 'estado',
    validate: {
      isIn: [['Pendiente', 'Confirmado', 'Negado', 'En revisión']]
    }
  },
  fecha_pago: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'fecha_pago'
  },
  fecha_revision: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_revision'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'observaciones'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'Comprobantes_pago',
  timestamps: false
});

// Associations
Receipt.belongsTo(Payment, { foreignKey: 'id_cobro', as: 'cobro' });
Payment.hasOne(Receipt, { foreignKey: 'id_cobro', as: 'comprobante' });

module.exports = Receipt;
