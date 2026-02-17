// src/models/HistorialAsignacionAgente.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HistorialAsignacionAgente = sequelize.define('HistorialAsignacionAgente', {
  id_historial: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Citas',
      key: 'id_cita'
    }
  },
  id_agente_anterior: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  id_agente_nuevo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  comentario: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado_asignacion: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Activa',
    validate: {
      isIn: [['Activa', 'Reasignada', 'Cancelada']]
    }
  },
  id_usuario_realizo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  }
}, {
  tableName: 'HistorialAsignacionAgentes',
  timestamps: false
});

module.exports = HistorialAsignacionAgente;
