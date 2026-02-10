const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rol_Permiso = sequelize.define('Rol_Permiso', {
  id_rol_permiso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_rol_permiso'
  },
  id_rol: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_rol'
  },
  id_permiso: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_permiso'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_asignacion'
  }
}, {
  tableName: 'Rol_Permiso',
  timestamps: false
});

module.exports = Rol_Permiso;
