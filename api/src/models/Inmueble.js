const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inmueble = sequelize.define('Inmuebles', {
  id_inmueble: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_inmueble'
  },
  registro_inmobiliario: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  pais: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  departamento: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  ciudad: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  barrio: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estrato: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  precio_venta: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  precio_arriendo: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  area_construida: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  area_terreno: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  operacion: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Venta'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  estado_frontend: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Disponible'
  },
  destacado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  fecha_registro: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'Inmuebles',
  timestamps: false
});

module.exports = Inmueble;
