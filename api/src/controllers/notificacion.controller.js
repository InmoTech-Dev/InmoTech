const notificacionService = require('../services/notificacion.service');
const logger = require('../utils/logger');

class NotificacionController {
  async obtenerNotificacionesNoLeidas(req, res, next) {
    try {
      const { id_rol, id_persona } = req.query;

      const notificaciones = await notificacionService.obtenerNotificacionesNoLeidas(
        id_rol ? parseInt(id_rol) : null,
        id_persona ? parseInt(id_persona) : null
      );

      return res.status(200).json({
        success: true,
        message: 'Notificaciones obtenidas exitosamente',
        data: notificaciones,
        total: notificaciones.length
      });
    } catch (error) {
      next(error);
    }
  }

  async marcarComoLeida(req, res, next) {
    try {
      const { id } = req.params;
      const notificacion = await notificacionService.marcarComoLeida(parseInt(id));

      return res.status(200).json({
        success: true,
        message: 'Notificación marcada como leída',
        data: notificacion
      });
    } catch (error) {
      next(error);
    }
  }

  async marcarVariasComoLeidas(req, res, next) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar un array de IDs'
        });
      }

      await notificacionService.marcarVariasComoLeidas(ids);

      return res.status(200).json({
        success: true,
        message: `${ids.length} notificaciones marcadas como leídas`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificacionController();
