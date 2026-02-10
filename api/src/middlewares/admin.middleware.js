const logger = require('../utils/logger');

/**
 * Middleware para validar acceso administrativo
 * Verifica que el usuario tenga roles administrativos
 */
const validarAccesoAdmin = (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Verificar que sea administrativo
    if (!req.user.es_administrativo) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos administrativos'
      });
    }

    logger.info(`Acceso administrativo autorizado para usuario: ${req.user.email}`);
    next();
  } catch (error) {
    logger.error('Error en middleware de admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para validar que el usuario NO sea administrativo
 * Útil para endpoints públicos donde solo clientes pueden registrarse
 */
const validarNoEsAdmin = (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Verificar que NO sea administrativo
    if (req.user.es_administrativo) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Los administrativos no pueden usar este endpoint'
      });
    }

    next();
  } catch (error) {
    logger.error('Error en middleware de no-admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  validarAccesoAdmin,
  validarNoEsAdmin
};
