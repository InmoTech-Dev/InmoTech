const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VentaAdjunto = sequelize.define(
  'VentaAdjunto',
  {
    id_adjunto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_adjunto'
    },
    id_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_venta'
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['comprobante', 'contrato']]
      },
      field: 'tipo'
    },
    nombre_archivo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'nombre_archivo'
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'url'
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type'
    },
    tamano_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'tamano_bytes'
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_creacion'
    }
  },
  {
    tableName: 'VentaAdjuntos',
    timestamps: false
  }
);

module.exports = VentaAdjunto;
