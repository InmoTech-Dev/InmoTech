const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PersonasRol = sequelize.define('Personas_rol', {
  id_persona_rol: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_persona_rol'
  },
  id_persona: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  id_rol: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Roles',
      key: 'id_rol'
    }
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  }
}, {
  tableName: 'Personas_rol',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['id_persona', 'id_rol'],
      name: 'UQ_Persona_Rol'
    }
  ]
});

module.exports = PersonasRol;
