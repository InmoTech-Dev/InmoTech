const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// ✅ CORRECTO: Importar desde el mismo directorio sin .model
const Inmueble = require('./Inmueble');  // Cambiar de './Inmueble.model' a './Inmueble'
const Persona = require('./Persona');
const Cita = require('./Cita');

const Lease = sequelize.define('Lease', {
  id_arrendamiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_arrendamiento'
  },
  id_inmueble: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_inmueble'
  },
  // En la BD la columna es id_arrendatario; el servicio la maneja como id_cliente
  id_cliente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_arrendatario'
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'fecha_inicio'
  },
  fecha_finalizacion: {
    type: DataTypes.DATEONLY,
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
  id_codeudor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'id_codeudor'
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

module.exports = Lease;
