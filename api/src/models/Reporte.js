const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Reporte = sequelize.define('Reportes', {
  id_reporte: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_reporte'
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_reporte: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prioridad: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pendiente',
    validate: {
      isIn: [['Pendiente', 'En Proceso', 'Completado', 'Cancelado']]
    }
  },
  id_persona_reporta: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  },
  fecha_resolucion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  observaciones_resolucion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Reportes',
  timestamps: false
});

module.exports = Reporte;
