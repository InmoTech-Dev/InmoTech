const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SeguimientoArrendamiento = sequelize.define('SeguimientoArrendamiento', {
  id_seguimiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_seguimiento'
  },
  id_arrendamiento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_arrendamiento'
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'estado'
  },
  comentario: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'comentario'
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'id_persona'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'Seguimiento_arrendamiento',
  timestamps: false,
  freezeTableName: true
});

module.exports = SeguimientoArrendamiento;
