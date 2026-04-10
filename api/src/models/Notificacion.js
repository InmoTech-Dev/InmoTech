const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notificacion = sequelize.define('Notificaciones', {
  id_notificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_notificacion'
  },
  tipo_notificacion: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [[
          'CITA_SOLICITADA',
          'CITA_CANCELADA',
          'CITA_REAGENDADA',
          'CITA_CONFIRMADA',
          'CITA_COMPLETADA',
          'ARRENDAMIENTO_PROXIMO_A_FINALIZAR'
        ]],
        msg: 'Tipo de notificación inválido'
      }
    }
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Citas',
      key: 'id_cita'
    }
  },
  id_rol_destino: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Roles',
      key: 'id_rol'
    }
  },
  id_persona_destino: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Personas',
      key: 'id_persona'
    }
  },
  leida: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'leida'  // Asegurar que mapea al campo BIT en SQL Server
  },
  fecha_leida: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('GETDATE()')
  }
}, {
  tableName: 'Notificaciones',
  timestamps: false,
  validate: {
    destinoValido() {
      if (!this.id_rol_destino && !this.id_persona_destino) {
        throw new Error('Debe especificar al menos un destinatario (rol o persona)');
      }
    }
  }
});

module.exports = Notificacion;
