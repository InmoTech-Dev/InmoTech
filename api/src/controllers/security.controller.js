const securityService = require('../services/security.service');
const logger = require('../utils/logger');

class SecurityController {
  async transferAdminHolder(req, res, next) {
    try {
      const { target_persona_id, disable_previous_account, reason } = req.validatedData;
      const actorUserId = req.user?.id;

      const result = await securityService.transferAdminHolder({
        actorUserId,
        targetPersonaId: target_persona_id,
        disablePreviousAccount: disable_previous_account,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: 'Titular de Administrador actualizado correctamente',
        data: result,
      });
    } catch (error) {
      logger.error('Error transfiriendo titular de Administrador:', error);
      next(error);
    }
  }
}

module.exports = new SecurityController();
