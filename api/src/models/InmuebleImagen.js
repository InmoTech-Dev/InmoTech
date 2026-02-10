const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InmuebleImagen = sequelize.define('Inmueble_Imagenes', {
  id_imagen: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_imagen'
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_inmueble'
  },
  nombre_archivo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  ruta_archivo: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  titulo: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  descripcion: {
    type: DataTypes.STRING(300),
    allowNull: true
  },
  es_principal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Inmueble_Imagenes',
  timestamps: false
});

module.exports = InmuebleImagen;
