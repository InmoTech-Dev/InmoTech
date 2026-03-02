const emailService = require('../services/email.service');
const administrativoService = require('../services/administrativo.service');
const logger = require('../utils/logger');

class ContactController {
  /**
   * Procesa el envío del formulario de contacto
   */
  async enviarMensajeContacto(req, res, next) {
    try {
      const { name, email, phone, subject, message } = req.body;

      // 1. Validaciones básicas
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos obligatorios deben ser completados'
        });
      }

      // 2. Obtener correos de administradores
      const adminEmails = await administrativoService.obtenerEmailsAdministradores();

      if (!adminEmails || adminEmails.length === 0) {
        logger.warn('No se encontraron correos de administradores para enviar el mensaje de contacto');
        // Opcional: Podrías enviar a un correo por defecto de fallbach si existe en .env
        if (process.env.EMAIL_FROM) {
            adminEmails.push(process.env.EMAIL_FROM);
        } else {
            return res.status(500).json({
                success: false,
                message: 'Error interno al procesar el contacto'
            });
        }
      }

      // 3. Enviar el email
      await emailService.enviarEmailContacto({
        name,
        email,
        phone,
        subject,
        message,
        targetEmails: adminEmails
      });

      return res.status(200).json({
        success: true,
        message: 'Mensaje enviado exitosamente. Nos pondremos en contacto contigo pronto.'
      });
    } catch (error) {
      logger.error('Error en ContactController.enviarMensajeContacto:', error);
      next(error);
    }
  }
}

module.exports = new ContactController();
