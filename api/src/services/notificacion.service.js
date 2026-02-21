const { Op } = require('sequelize');
const { Notificacion, Rol } = require('../models');
const logger = require('../utils/logger');

class NotificacionService {
  async obtenerRolesActivos(roleNames = []) {
    if (!Array.isArray(roleNames) || roleNames.length === 0) {
      return [];
    }

    const roles = await Rol.findAll({
      where: {
        nombre_rol: { [Op.in]: roleNames },
        estado: true
      },
      attributes: ['id_rol']
    });

    return roles.map((rol) => rol.id_rol);
  }

  async construirFiltroDestinatario({ idPersona, roleNames = [] }) {
    const destinatarios = [];

    if (idPersona) {
      destinatarios.push({ id_persona_destino: idPersona });
    }

    const roleIds = await this.obtenerRolesActivos(roleNames);
    if (roleIds.length > 0) {
      destinatarios.push({ id_rol_destino: { [Op.in]: roleIds } });
    }

    if (destinatarios.length === 0) {
      return null;
    }

    if (destinatarios.length === 1) {
      return destinatarios[0];
    }

    return { [Op.or]: destinatarios };
  }

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

      logger.info(`Notificacion creada: ${tipo} - Cita ${id_cita}`);
      return notificacion;
    } catch (error) {
      logger.error('Error al crear notificacion:', error);
      throw error;
    }
  }

  async obtenerNotificacionesNoLeidas(scope = {}) {
    try {
      const filtroDestinatario = await this.construirFiltroDestinatario(scope);
      if (!filtroDestinatario) {
        return [];
      }

      const notificaciones = await Notificacion.findAll({
        where: {
          leida: false,
          ...filtroDestinatario
        },
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
      logger.error('Error al obtener notificaciones no leidas:', error);
      throw error;
    }
  }

  async marcarComoLeida(id_notificacion, scope = {}) {
    try {
      const filtroDestinatario = await this.construirFiltroDestinatario(scope);
      if (!filtroDestinatario) {
        const error = new Error('No tienes permisos para esta notificacion');
        error.status = 403;
        throw error;
      }

      const notificacion = await Notificacion.findOne({
        where: {
          id_notificacion,
          ...filtroDestinatario
        }
      });

      if (!notificacion) {
        const error = new Error('Notificacion no encontrada');
        error.status = 404;
        throw error;
      }

      await notificacion.update({
        leida: true,
        fecha_leida: new Date()
      });

      logger.info(`Notificacion marcada como leida: ${id_notificacion}`);
      return notificacion;
    } catch (error) {
      logger.error('Error al marcar notificacion como leida:', error);
      throw error;
    }
  }

  async marcarVariasComoLeidas(ids_notificaciones, scope = {}) {
    try {
      const filtroDestinatario = await this.construirFiltroDestinatario(scope);
      if (!filtroDestinatario) {
        return 0;
      }

      const [filasActualizadas] = await Notificacion.update(
        {
          leida: true,
          fecha_leida: new Date()
        },
        {
          where: {
            id_notificacion: { [Op.in]: ids_notificaciones },
            leida: false,
            ...filtroDestinatario
          }
        }
      );

      logger.info(`${filasActualizadas} notificaciones marcadas como leidas`);
      return filasActualizadas;
    } catch (error) {
      logger.error('Error al marcar varias notificaciones como leidas:', error);
      throw error;
    }
  }
}

module.exports = new NotificacionService();
