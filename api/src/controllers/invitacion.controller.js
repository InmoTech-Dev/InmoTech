const invitacionService = require('../services/invitacion.service');
const logger = require('../utils/logger');

class InvitacionController {
  async crear(req, res, next) {
    try {
      const { id_persona } = req.validatedData;
      const adminId = req.user.id;
      const result = await invitacionService.crearInvitacion({ id_persona, creado_por: adminId });
      logger.info(`Invitacion creada por admin ${adminId} para persona ${id_persona}`);
      return res.status(201).json({
        success: true,
        message: 'Invitacion creada y enviada',
        data: { expira_en: result.expira_en }
      });
    } catch (error) {
      logger.error('Error creando invitacion:', error);
      next(error);
    }
  }

  async validar(req, res, next) {
    try {
      const { token } = req.validatedQuery;
      logger.info(`Validando invitacion desde IP ${req.ip}`);
      const data = await invitacionService.validar(token);
      logger.info(`Invitacion valida tipo [${data.tipo}] para persona [${data.id_persona}] desde IP ${req.ip}`);
      return res.status(200).json({
        success: true,
        message: 'Invitacion valida',
        data
      });
    } catch (error) {
      logger.warn(`Invitacion invalida o token no encontrado desde IP ${req.ip}: ${error.message}`);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async aceptar(req, res, next) {
    try {
      const { token, codigo_6d, password } = req.validatedData;
      const ip = req.ip;
      const userAgent = req.get('user-agent');
      const data = await invitacionService.aceptar({ token, codigo_6d, password, ip, userAgent });
      logger.info(`Invitacion aceptada desde IP ${ip || 'N/A'} UA ${userAgent || 'N/A'}`);
      return res.status(200).json({
        success: true,
        message: 'Contraseña establecida exitosamente',
        data
      });
    } catch (error) {
      logger.warn('Error aceptando invitacion:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async reenviar(req, res, next) {
    try {
      const { token } = req.validatedData;
      const data = await invitacionService.reenviar(token);
      logger.info(`Reenvio de invitacion solicitado desde IP ${req.ip}`);
      return res.status(200).json({
        success: true,
        message: 'Invitación reenviada',
        data: { expira_en: data.expira_en }
      });
    } catch (error) {
      logger.warn('Error reenviando invitacion:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new InvitacionController();
