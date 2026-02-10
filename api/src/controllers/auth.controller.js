const authService = require('../services/auth.service');
const logger = require('../utils/logger');

const buildCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookies = process.env.COOKIE_SECURE === 'true' || isProduction;
  const sameSite = process.env.COOKIE_SAMESITE || 'lax';
  return { secureCookies, sameSite };
};

class AuthController {
  async registrarUsuario(req, res, next) {
    try {
      const userData = req.validatedData;
      const result = await authService.registrarUsuario(userData);

      return res.status(201).json({
        success: true,
        message: 'Registro recibido. Revisa tu correo y confirma tu cuenta en las proximas 24 horas.',
        data: { user: result.user, verification: result.verification, meta: result.meta },
      });
    } catch (error) {
      logger.error('Error en registro de usuario:', error);
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
          reason: error.code || null,
          data: error.meta || null,
        });
      }
      next(error);
    }
  }

  async iniciarSesion(req, res, next) {
    try {
      const { email, password } = req.validatedData;
      const result = await authService.iniciarSesion(email, password);
      const { accessToken, refreshToken } = result;
      const { secureCookies, sameSite } = buildCookieOptions();

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: secureCookies,
        sameSite,
        maxAge: 60 * 60 * 1000, // 1h
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: secureCookies,
        sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
      });

      return res.status(200).json({
        success: true,
        message: 'Inicio de sesion exitoso',
        data: {
          user: result.user,
          accessToken,
          refreshToken
        },
      });
    } catch (error) {
      logger.error('Error en inicio de sesion:', error);
      if (error.code === 'EMAIL_NOT_VERIFIED' || error.code === 'EMAIL_VERIFICATION_LIMIT') {
        return res.status(error.status || 403).json({
          success: false,
          message: error.message,
          reason: error.code,
          data: error.meta || null,
        });
      }
      if (error.code === 'INVALID_CREDENTIALS') {
        return res.status(error.status || 401).json({
          success: false,
          message: error.message,
          reason: error.code || 'INVALID_CREDENTIALS',
        });
      }
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
          reason: error.code || null,
          data: error.meta || null,
        });
      }
      next(error);
    }
  }

  async refrescarToken(req, res, next) {
    try {
      const { refreshToken } = req.validatedData;
      const tokens = await authService.refrescarToken(refreshToken);
      const { secureCookies, sameSite } = buildCookieOptions();

      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: secureCookies,
        sameSite,
        maxAge: 60 * 60 * 1000,
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: secureCookies,
        sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: 'Token refrescado exitosamente',
        data: tokens,
      });
    } catch (error) {
      logger.error('Error refrescando token:', error);
      next(error);
    }
  }

  async verificarCodigo(req, res, next) {
    try {
      const { email, codigo } = req.validatedData;
      const data = await authService.verificarCodigoCorreo(email, codigo, { ip: req.ip, userAgent: req.get('user-agent') });
      return res.status(200).json({
        success: true,
        message: data?.ya_verificado ? 'Tu correo ya estaba verificado' : 'Correo verificado exitosamente',
        data,
      });
    } catch (error) {
      logger.warn('Verificacion de codigo fallida:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async reenviarCodigo(req, res, next) {
    try {
      const { email } = req.validatedData;
      const roles = req.user?.roles || [];
      const isAdmin = roles.includes('Super Administrador') || roles.includes('Administrador');

      const data = await authService.reenviarCodigoVerificacion(email, { ignoreLimits: isAdmin });
      return res.status(200).json({
        success: true,
        message: 'Hemos enviado un nuevo codigo a tu correo',
        data,
      });
    } catch (error) {
      logger.warn('Error reenviando codigo de verificacion:', error.message);
      return res.status(error.code === 'VERIFICATION_LIMIT' ? 429 : 400).json({
        success: false,
        message: error.message,
        reason: error.code || null,
      });
    }
  }

  async verificarCorreo(req, res, next) {
    try {
      const { token } = req.validatedQuery;
      const data = await authService.verificarCorreo(token, { ip: req.ip, userAgent: req.get('user-agent') });
      return res.status(200).json({
        success: true,
        message: 'Correo verificado exitosamente',
        data,
      });
    } catch (error) {
      logger.warn('Verificacion de correo fallida:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async obtenerPerfil(req, res, next) {
    try {
      const userId = req.user.id;
      const perfil = await authService.obtenerPerfil(userId);

      return res.status(200).json({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: perfil,
      });
    } catch (error) {
      logger.error('Error obteniendo perfil:', error);

      if (error.message.includes('Usuario inactivo') || error.message.includes('deshabilitado')) {
        logger.warn(`Logout forzado para usuario ${req.user.id}: ${error.message}`);
        return res.status(423).json({
          success: false,
          message: 'Tu cuenta ha sido deshabilitada por un administrador. Sesion terminada.',
          forceLogout: true,
          reason: 'user_disabled',
        });
      }

      if (error.message.includes('Acceso administrativo revocado')) {
        logger.warn(`Logout forzado para usuario administrativo ${req.user.id}: ${error.message}`);
        return res.status(403).json({
          success: false,
          message: 'Tu acceso administrativo ha sido revocado. Sesion terminada.',
          forceLogout: true,
          reason: 'admin_access_revoked',
        });
      }

      next(error);
    }
  }

  async actualizarPerfil(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.validatedData;
      const perfilActualizado = await require('../services/persona.service').actualizarPerfil(userId, updateData, userId);

      return res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: perfilActualizado,
      });
    } catch (error) {
      logger.error('Error actualizando perfil:', error);
      next(error);
    }
  }

  async cambiarContrasena(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.validatedData;

      await authService.cambiarContrasena(userId, currentPassword, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Contrasena cambiada exitosamente',
      });
    } catch (error) {
      logger.error('Error cambiando contrasena:', error);
      next(error);
    }
  }

  async cerrarSesion(req, res, next) {
    try {
      const { secureCookies, sameSite } = buildCookieOptions();

      res.clearCookie('accessToken', { httpOnly: true, secure: secureCookies, sameSite });
      res.clearCookie('refreshToken', { httpOnly: true, secure: secureCookies, sameSite });

      return res.status(200).json({
        success: true,
        message: 'Sesion cerrada exitosamente',
      });
    } catch (error) {
      logger.error('Error cerrando sesion:', error);
      next(error);
    }
  }

  async obtenerUltimoCambioPassword(req, res, next) {
    try {
      const userId = req.user.id;
      const ultimoCambio = await authService.obtenerUltimoCambioPassword(userId);

      return res.status(200).json({
        success: true,
        message: 'Ultimo cambio de contrasena obtenido exitosamente',
        data: { ultimo_cambio_password: ultimoCambio },
      });
    } catch (error) {
      logger.error('Error obteniendo ultimo cambio de contrasena:', error);
      next(error);
    }
  }

  async solicitarRecuperacionContrasena(req, res, next) {
    try {
      const { email } = req.validatedData;
      await authService.solicitarRecuperacionContrasena(email);

      return res.status(200).json({
        success: true,
        message: 'Si el correo se encuentra registrado, se envio un codigo y enlace para restablecer la contrasena.',
      });
    } catch (error) {
      logger.error('Error solicitando recuperacion de contrasena:', error);
      next(error);
    }
  }

  async restablecerContrasena(req, res, next) {
    try {
      const { token, password } = req.validatedData;
      await authService.restablecerContrasena(token, password);

      return res.status(200).json({
        success: true,
        message: 'Contrasena restablecida correctamente.',
      });
    } catch (error) {
      logger.error('Error restableciendo contrasena:', error);
      next(error);
    }
  }

  async validarTokenRecuperacion(req, res, next) {
    try {
      const { token } = req.validatedQuery;
      const data = await authService.validarTokenRecuperacion(token);

      return res.status(200).json({
        success: true,
        message: 'Token de recuperacion valido',
        data,
      });
    } catch (error) {
      logger.error('Error validando token de recuperacion:', error);
      next(error);
    }
  }
}

module.exports = new AuthController();
