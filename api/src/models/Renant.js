const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Persona = require('./Persona');

const Renant = sequelize.define('Renant', {
  id_arrendatario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_arrendatario'
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'id_persona',
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  registro_arrendatario: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'registro_arrendatario'
  },
  fecha_registro_arrendatario: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()'),
    field: 'fecha_registro_arrendatario'
  },
  tipo_arrendatario: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Potencial',
    field: 'tipo_arrendatario',
    validate: {
      isIn: [['Potencial', 'En Proceso', 'Activo', 'Inactivo']]
    }
  },
  ciudad_residencia: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'ciudad_residencia'
  },
  direccion_anterior: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'direccion_anterior'
  },
  contacto_emergencia_nombre: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contacto_emergencia_nombre'
  },
  contacto_emergencia_telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'contacto_emergencia_telefono'
  },
  contacto_emergencia_parentesco: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'contacto_emergencia_parentesco'
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Activo',
    field: 'estado',
    validate: {
      isIn: [['Activo', 'Inactivo', 'Moroso', 'Proceso']]
    }
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'observaciones'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()'),
    field: 'fecha_creacion'
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_actualizacion'
  }
}, {
  tableName: 'Arrendatarios',
  timestamps: false,
  hooks: {
    beforeUpdate: (renant) => {
      renant.fecha_actualizacion = new Date();
    }
  }
});

Renant.belongsTo(Persona, { foreignKey: 'id_persona', as: 'persona' });
Persona.hasOne(Renant, { foreignKey: 'id_persona', as: 'renant' });

module.exports = Renant;
