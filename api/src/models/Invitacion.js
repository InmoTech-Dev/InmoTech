const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invitacion = sequelize.define('Invitaciones', {
  id_invitacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_invitacion'
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'admin_invite'
  },
  token_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  codigo_6d: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  expira_en: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usado_en: {
    type: DataTypes.DATE,
    allowNull: true
  },
  intentos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  reenvios: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  creado_en: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  },
  creado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ip_uso: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  ua_uso: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'Invitaciones',
  timestamps: false,
  indexes: [
    { fields: ['token_hash'], unique: true, name: 'IX_Invitaciones_TokenHash' },
    { fields: ['id_persona'], name: 'IX_Invitaciones_Persona' },
    { fields: ['expira_en'], name: 'IX_Invitaciones_Expira' }
  ]
});

module.exports = Invitacion;
