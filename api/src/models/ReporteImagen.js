const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReporteImagen = sequelize.define('ReporteImagen', {
  id_imagen: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_imagen'
  },
  id_reporte: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Reportes',
      key: 'id_reporte'
    }
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  }
}, {
  tableName: 'ImagenesReportes',
  timestamps: false
});

module.exports = ReporteImagen;
