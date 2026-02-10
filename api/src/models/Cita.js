// src/models/Cita.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cita = sequelize.define('Cita', {
  id_cita: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona',
    },
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Inmuebles',
      key: 'id_inmueble',
    },
  },
  id_servicio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Servicios_Cita',
      key: 'id_servicio',
    },
  },
  fecha_cita: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  id_estado_cita: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1, // 1 = Solicitada
    references: {
      model: 'Estados_Cita',
      key: 'id_estado_cita',
    },
  },
  id_agente_asignado: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Personas',
      key: 'id_persona',
    },
  },
  id_usuario_creador: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Personas',
      key: 'id_persona',
    },
  },
  id_cita_original: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Citas',
      key: 'id_cita',
    },
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  motivo_cancelacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  motivo_reagendamiento: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ediciones_realizadas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  ediciones_maximas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
  },
  fecha_confirmacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fecha_cancelacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fecha_completada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()'),
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'Citas',
  timestamps: false,
});

module.exports = Cita;
