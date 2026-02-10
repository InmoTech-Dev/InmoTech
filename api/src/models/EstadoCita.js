const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EstadoCita = sequelize.define('Estados_cita', {
  id_estado_cita: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_estado_cita'
  },
  nombre_estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  es_estado_final: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '1 si es Completada o Cancelada'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'Estados_cita',
  timestamps: false
});

module.exports = EstadoCita;
