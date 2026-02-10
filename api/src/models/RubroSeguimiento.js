const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RubroSeguimiento = sequelize.define('RubroSeguimiento', {
  id_seguimiento_rubro: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_seguimiento_rubro'
  },
  id_rubro: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'RubrosReportes',
      key: 'id_rubro'
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
  tableName: 'SeguimientoRubro',
  timestamps: false
});

module.exports = RubroSeguimiento;
