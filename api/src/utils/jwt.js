const jwt = require('jsonwebtoken');
const logger = require('./logger');

const getRequiredSecret = (name) => {
  const raw = process.env[name];
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error(`[JWT] Missing required environment variable: ${name}`);
  }
  return raw.trim();
};

const JWT_SECRET = getRequiredSecret('JWT_SECRET');
const JWT_REFRESH_SECRET = getRequiredSecret('JWT_REFRESH_SECRET');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

class JWTUtils {
  /**
   * Genera un token de acceso JWT
   * @param {Object} payload - Datos del usuario
   * @returns {string} Token JWT
   */
  generateAccessToken(payload) {
    try {
      // Agregar flag de administrativo al payload
      const enhancedPayload = {
        ...payload,
        es_administrativo: payload.es_administrativo || false
      };
      return jwt.sign(enhancedPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    } catch (error) {
      logger.error('Error generando token de acceso:', error);
      throw new Error('Error al generar token de acceso');
    }
  }

  /**
   * Genera un token de refresco JWT
   * @param {Object} payload - Datos del usuario
   * @returns {string} Token de refresco JWT
   */
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    } catch (error) {
      logger.error('Error generando token de refresco:', error);
      throw new Error('Error al generar token de refresco');
    }
  }

  /**
   * Verifica un token de acceso JWT
   * @param {string} token - Token JWT
   * @returns {Object} Payload decodificado
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logger.error('Error verificando token de acceso:', { message: error.message, name: error.name });
      // Re-lanzar el error original para ser manejado por el middleware
      throw error;
    }
  }

  /**
   * Verifica un token de refresco JWT
   * @param {string} token - Token de refresco JWT
   * @returns {Object} Payload decodificado
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      logger.error('Error verificando token de refresco:', error);
      throw new Error('Token de refresco inválido o expirado');
    }
  }

  /**
   * Genera ambos tokens (acceso y refresco)
   * @param {Object} payload - Datos del usuario
   * @returns {Object} Objeto con accessToken y refreshToken
   */
  generateTokens(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Extrae token del header Authorization
   * @param {string} authHeader - Header Authorization
   * @returns {string|null} Token extraído o null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = new JWTUtils();
