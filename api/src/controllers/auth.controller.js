const authService = require('../services/auth.service');
const logger = require('../utils/logger');
const opsConsoleLogger = require('../utils/opsConsoleLogger');
const jwtUtils = require('../utils/jwt');
const { generateCsrfToken, CSRF_COOKIE_NAME } = require('../middlewares/csrf.middleware');

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';
const DEFAULT_ACCESS_TOKEN_MS = 60 * 60 * 1000;
const DEFAULT_REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

const parseDurationToMs = (rawValue, fallbackValue) => {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue * 1000;
  }

  if (!rawValue || typeof rawValue !== 'string') {
    return fallbackValue;
  }

  const normalized = rawValue.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) {
    return fallbackValue;
  }

  const amount = Number(match[1]);
  const unit = match[2] || 's';

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return fallbackValue;
  }
};

const buildCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookies = process.env.COOKIE_SECURE === 'true' || isProduction;
  const sameSite = process.env.COOKIE_SAMESITE || 'lax';
  const accessTokenMaxAge = parseDurationToMs(process.env.JWT_EXPIRES_IN, DEFAULT_ACCESS_TOKEN_MS);
  const refreshTokenMaxAge = parseDurationToMs(
    process.env.JWT_REFRESH_EXPIRES_IN,
    DEFAULT_REFRESH_TOKEN_MS
  );

  return {
    secureCookies,
    sameSite,
    accessTokenMaxAge,
    refreshTokenMaxAge,
  };
};

const setAuthCookies = (res, accessToken, refreshToken, cookieOptions) => {
  const baseOptions = {
    httpOnly: true,
    secure: cookieOptions.secureCookies,
    sameSite: cookieOptions.sameSite,
  };

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...baseOptions,
    maxAge: cookieOptions.accessTokenMaxAge,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...baseOptions,
    maxAge: cookieOptions.refreshTokenMaxAge,
  });
};

const setCsrfCookie = (res, cookieOptions) => {
  const csrfToken = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: cookieOptions.secureCookies,
    sameSite: cookieOptions.sameSite,
    maxAge: cookieOptions.refreshTokenMaxAge,
  });

  return csrfToken;
};

const buildMobileTokenData = (result) => ({
  user: result.user,
  accessToken: result.accessToken,
  refreshToken: result.refreshToken,
  tokenType: 'Bearer',
  accessTokenExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
});

const clearAuthCookies = (res, cookieOptions) => {
  const clearOptions = {
    secure: cookieOptions.secureCookies,
    sameSite: cookieOptions.sameSite,
  };

  res.clearCookie(ACCESS_COOKIE_NAME, clearOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, clearOptions);
  res.clearCookie(CSRF_COOKIE_NAME, clearOptions);
};

const resolveClientIp = (req) => {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

class AuthController {
  async iniciarSesion(req, res, next) {
    const { email, password } = req.validatedData;
    const clientIp = resolveClientIp(req);
    const userAgent = req.get('user-agent') || 'unknown';

    opsConsoleLogger.authBlock({
      action: 'LOGIN',
      outcome: 'ATTEMPT',
      fields: [
        { label: 'email', value: email },
        {
          label: 'password',
          value: opsConsoleLogger.isPlainPasswordEnabled ? password : '********'
        },
        { label: 'ip', value: clientIp },
        { label: 'user-agent', value: userAgent },
      ],
      footer: '⏳ validando credenciales...',
    });

    try {
      const result = await authService.iniciarSesion(email, password);
      const { accessToken, refreshToken } = result;
      const cookieOptions = buildCookieOptions();
      setAuthCookies(res, accessToken, refreshToken, cookieOptions);
      setCsrfCookie(res, cookieOptions);

      opsConsoleLogger.authBlock({
        action: 'LOGIN',
        outcome: 'OK',
        fields: [
          { label: 'email', value: email },
          { label: 'user-id', value: result?.user?.id_persona || result?.user?.id || 'unknown' },
          { label: 'ip', value: clientIp },
        ],
        footer: '✅ sesion iniciada',
      });

      return res.status(200).json({
        success: true,
        message: 'Inicio de sesion exitoso',
        data: {
          user: result.user
        },
      });
    } catch (error) {
      opsConsoleLogger.authBlock({
        action: 'LOGIN',
        outcome: 'FAIL',
        method: 'warn',
        fields: [
          { label: 'email', value: email },
          { label: 'ip', value: clientIp },
          { label: 'reason', value: error.code || error.message || 'UNKNOWN_ERROR' },
        ],
        footer: '❌ sesion no iniciada',
      });
      logger.error('Error en inicio de sesion:', error);
      if (error.code === 'ACCOUNT_DISABLED') {
        return res.status(error.status || 423).json({
          success: false,
          message: error.message,
          reason: 'account_disabled',
        });
      }
      if (error.code === 'ADMIN_ACCESS_REVOKED') {
        return res.status(error.status || 403).json({
          success: false,
          message: error.message,
          reason: 'admin_access_revoked',
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

  async iniciarSesionMovil(req, res, next) {
    const { email, password } = req.validatedData;
    const clientIp = resolveClientIp(req);

    try {
      const result = await authService.iniciarSesion(email, password);

      return res.status(200).json({
        success: true,
        message: 'Inicio de sesion exitoso',
        data: buildMobileTokenData(result),
      });
    } catch (error) {
      logger.error('Error en inicio de sesion movil:', {
        email,
        ip: clientIp,
        reason: error.code || error.message,
      });

      if (error.code === 'ACCOUNT_DISABLED') {
        return res.status(error.status || 423).json({
          success: false,
          message: error.message,
          reason: 'account_disabled',
        });
      }
      if (error.code === 'ADMIN_ACCESS_REVOKED') {
        return res.status(error.status || 403).json({
          success: false,
          message: error.message,
          reason: 'admin_access_revoked',
        });
      }
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
      const refreshTokenFromCookie = req.cookies?.refreshToken;
      const refreshToken = refreshTokenFromCookie;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Token de refresco requerido',
          reason: 'REFRESH_TOKEN_REQUIRED',
        });
      }

      const tokens = await authService.refrescarToken(refreshToken);
      const cookieOptions = buildCookieOptions();
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken, cookieOptions);
      setCsrfCookie(res, cookieOptions);

      return res.status(200).json({
        success: true,
        message: 'Token refrescado exitosamente',
        data: {
          user: tokens.user
        },
      });
    } catch (error) {
      logger.error('Error refrescando token:', error);
      const normalizedReason =
        error.code === 'ACCOUNT_DISABLED'
          ? 'account_disabled'
          : error.code === 'ADMIN_ACCESS_REVOKED'
            ? 'admin_access_revoked'
            : error.code || 'INVALID_REFRESH_TOKEN';

      return res.status(error.status || 401).json({
        success: false,
        message: error.message || 'Token de refresco invalido o expirado',
        reason: normalizedReason,
        forceLogout: normalizedReason === 'account_disabled' || normalizedReason === 'admin_access_revoked',
      });
    }
  }

  async refrescarTokenMovil(req, res, next) {
    try {
      const refreshToken =
        req.validatedData?.refreshToken ||
        req.body?.refreshToken ||
        jwtUtils.extractTokenFromHeader(req.get('authorization'));

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Token de refresco requerido',
          reason: 'REFRESH_TOKEN_REQUIRED',
        });
      }

      const tokens = await authService.refrescarToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Token refrescado exitosamente',
        data: buildMobileTokenData(tokens),
      });
    } catch (error) {
      logger.error('Error refrescando token movil:', error);
      const normalizedReason =
        error.code === 'ACCOUNT_DISABLED'
          ? 'account_disabled'
          : error.code === 'ADMIN_ACCESS_REVOKED'
            ? 'admin_access_revoked'
            : error.code || 'INVALID_REFRESH_TOKEN';

      return res.status(error.status || 401).json({
        success: false,
        message: error.message || 'Token de refresco invalido o expirado',
        reason: normalizedReason,
        forceLogout:
          normalizedReason === 'account_disabled' || normalizedReason === 'admin_access_revoked',
      });
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

      if (error.code === 'ACCOUNT_DISABLED' || error.message.includes('Usuario inactivo') || error.message.includes('deshabilitado')) {
        logger.warn(`Logout forzado para usuario ${req.user.id}: ${error.message}`);
        return res.status(423).json({
          success: false,
          message: 'Tu cuenta esta deshabilitada. Comunicate con soporte o con un administrador.',
          forceLogout: true,
          reason: 'account_disabled',
        });
      }

      if (error.code === 'ADMIN_ACCESS_REVOKED' || error.message.includes('Acceso administrativo revocado')) {
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
      const cookieOptions = buildCookieOptions();
      clearAuthCookies(res, cookieOptions);

      opsConsoleLogger.authBlock({
        action: 'LOGOUT',
        outcome: 'OK',
        fields: [
          { label: 'user-id', value: req.user?.id || req.user?.id_persona || 'anonymous' },
          { label: 'email', value: req.user?.email || req.user?.correo || 'unknown' },
          { label: 'ip', value: resolveClientIp(req) },
        ],
        footer: '✅ sesion cerrada',
      });

      return res.status(200).json({
        success: true,
        message: 'Sesion cerrada exitosamente',
      });
    } catch (error) {
      opsConsoleLogger.authBlock({
        action: 'LOGOUT',
        outcome: 'FAIL',
        method: 'error',
        fields: [
          { label: 'reason', value: error.message || 'UNKNOWN_ERROR' },
          { label: 'ip', value: resolveClientIp(req) },
        ],
        footer: '❌ no se pudo cerrar la sesion',
      });
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
