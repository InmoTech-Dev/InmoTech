const { Notificacion } = require('../models');
const logger = require('../utils/logger');

class NotificacionService {
  async crearNotificacion({ tipo, titulo, mensaje, id_cita, id_rol_destino = null, id_persona_destino = null }) {
    try {
      const notificacion = await Notificacion.create({
        tipo_notificacion: tipo,
        titulo,
        mensaje,
        id_cita,
        id_rol_destino,
        id_persona_destino,
        leida: false
      });

      logger.info(`Notificación creada: ${tipo} - Cita ${id_cita}`);
      return notificacion;
    } catch (error) {
      logger.error('Error al crear notificación:', error);
      throw error;
    }
  }

  async obtenerNotificacionesNoLeidas(id_rol = null, id_persona = null) {
    try {
      const where = {
        leida: false
      };

      if (id_rol) {
        where.id_rol_destino = id_rol;
      }

      if (id_persona) {
        where.id_persona_destino = id_persona;
      }

      const notificaciones = await Notificacion.findAll({
        where,
        order: [['fecha_creacion', 'DESC']],
        include: [
          {
            association: 'cita',
            include: ['cliente', 'inmueble', 'servicio', 'estado']
          }
        ]
      });

      return notificaciones;
    } catch (error) {
      logger.error('Error al obtener notificaciones no leídas:', error);
      throw error;
    }
  }

  async marcarComoLeida(id_notificacion) {
    try {
      const notificacion = await Notificacion.findByPk(id_notificacion);

      if (!notificacion) {
        throw new Error('Notificación no encontrada');
      }

      await notificacion.update({
        leida: true,
        fecha_leida: new Date()
      });

      logger.info(`Notificación marcada como leída: ${id_notificacion}`);
      return notificacion;
    } catch (error) {
      logger.error('Error al marcar notificación como leída:', error);
      throw error;
    }
  }

  async marcarVariasComoLeidas(ids_notificaciones) {
    try {
      await Notificacion.update(
        {
          leida: true,
          fecha_leida: new Date()
        },
        {
          where: {
            id_notificacion: ids_notificaciones
          }
        }
      );

      logger.info(`${ids_notificaciones.length} notificaciones marcadas como leídas`);
      return true;
    } catch (error) {
      logger.error('Error al marcar varias notificaciones como leídas:', error);
      throw error;
    }
  }
}

module.exports = new NotificacionService();
