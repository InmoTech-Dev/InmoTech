const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Buyer = sequelize.define('Buyer', {
  id_comprador: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_comprador'
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_persona',
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  registro_comprador: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'registro_comprador'
  },
  fecha_registro_comprador: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro_comprador'
  },
  tipo_comprador: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Potencial',
    field: 'tipo_comprador',
    validate: {
      isIn: [['Potencial', 'En Proceso', 'Finalizado']]
    }
  },
  ciudad_residencia: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'ciudad_residencia'
  },
  direccion_anterior: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'direccion_anterior'
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Activo',
    field: 'estado',
    validate: {
      isIn: [['Activo', 'Inactivo', 'Proceso']]
    }
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
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_actualizacion'
  }
}, {
  tableName: 'Compradores',
  timestamps: false,
  hooks: {
    beforeUpdate: (buyer) => {
      buyer.fecha_actualizacion = new Date();
    }
  }
});

module.exports = Buyer;
