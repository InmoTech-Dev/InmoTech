const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Acceso = sequelize.define('Acceso', {
  id_acceso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_acceso'
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  contrasena: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  password_change_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  },
  ultimo_acceso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ultimo_cambio_password: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: sequelize.literal('GETDATE()')
  }
}, {
  tableName: 'Acceso',
  timestamps: false
});

module.exports = Acceso;
