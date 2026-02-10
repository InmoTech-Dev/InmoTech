const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permiso = sequelize.define('Permisos', {
  id_permiso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_permiso'
  },
  id_rol: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_rol'
  },
  modulo: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  permiso: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'Permisos',
  timestamps: false
});

module.exports = Permiso;
