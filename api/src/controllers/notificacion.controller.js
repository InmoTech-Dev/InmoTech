const notificacionService = require('../services/notificacion.service');

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

class NotificacionController {
  construirScopeUsuario(req) {
    const idPersona = parseId(req.user?.id_persona || req.user?.id);
    const roleNames = Array.isArray(req.user?.roles) ? req.user.roles : [];
    return { idPersona, roleNames };
  }

  async obtenerNotificacionesNoLeidas(req, res, next) {
    try {
      const scope = this.construirScopeUsuario(req);
      const notificaciones = await notificacionService.obtenerNotificacionesNoLeidas(scope);

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
      const id = parseId(req.params.id);
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID de notificacion invalido'
        });
      }

      const scope = this.construirScopeUsuario(req);
      const notificacion = await notificacionService.marcarComoLeida(id, scope);

      return res.status(200).json({
        success: true,
        message: 'Notificacion marcada como leida',
        data: notificacion
      });
    } catch (error) {
      next(error);
    }
  }

  async marcarVariasComoLeidas(req, res, next) {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.map(parseId).filter(Boolean)
        : [];

      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar un array de IDs valido'
        });
      }

      const scope = this.construirScopeUsuario(req);
      const actualizadas = await notificacionService.marcarVariasComoLeidas(ids, scope);

      return res.status(200).json({
        success: true,
        message: `${actualizadas} notificaciones marcadas como leidas`,
        data: { total_actualizadas: actualizadas }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificacionController();
