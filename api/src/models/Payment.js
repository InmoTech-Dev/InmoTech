const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Lease = require('./Lease');

const Payment = sequelize.define('Payment', {
  id_cobro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_cobro'
  },
  id_arrendamiento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_arrendamiento',
    references: {
      model: 'Arrendamientos',
      key: 'id_arrendamiento'
    }
  },
  fecha_cobro: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'fecha_cobro'
  },
  fecha_limite: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'fecha_limite'
  },
  valor_pago: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'valor_pago'
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pendiente',
    field: 'estado',
    validate: {
      isIn: [['Pendiente', 'Pagado', 'Vencido', 'Cancelado']]
    }
  },
  fecha_pago: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_pago'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'Cobros',
  timestamps: false
});

// Associations
Payment.belongsTo(Lease, { foreignKey: 'id_arrendamiento', as: 'arrendamiento' });
Lease.hasMany(Payment, { foreignKey: 'id_arrendamiento', as: 'cobros' });

module.exports = Payment;
