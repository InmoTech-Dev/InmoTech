const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReporteArchivo = sequelize.define('ReporteArchivo', {
  id_archivo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_archivo'
  },
  id_reporte: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Reportes',
      key: 'id_reporte'
    }
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false
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
  tableName: 'ArchivosReportes',
  timestamps: false
});

module.exports = ReporteArchivo;
