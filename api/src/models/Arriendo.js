const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Arriendo = sequelize.define('Arriendo', {
  id_arrendamiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_arrendamiento'
  },
  id_arrendatario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_arrendatario'
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_inmueble'
  },
  fecha_inicio: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fecha_inicio'
  },
  fecha_finalizacion: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fecha_finalizacion'
  },
  valor_mensual: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'valor_mensual'
  },
  tipo_garantia: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'tipo_garantia'
  },
  valor_garantia: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'valor_garantia'
  },
  descripcion_garantia: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'descripcion_garantia'
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Activo',
    field: 'estado'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'Arrendamientos',
  timestamps: false,
  freezeTableName: true
});

module.exports = Arriendo;
