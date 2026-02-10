const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReporteSeguimientoGeneral = sequelize.define('ReporteSeguimientoGeneral', {
  id_seguimiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_seguimiento'
  },
  id_reporte: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Reportes',
      key: 'id_reporte'
    }
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['Pendiente', 'En Proceso', 'Completado', 'Cancelado']]
    }
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  }
}, {
  tableName: 'SeguimientosReportes',
  timestamps: false
});

module.exports = ReporteSeguimientoGeneral;
