const jwtUtils = require('../utils/jwt');

const logger = require('../utils/logger');

const { Permiso, Rol } = require('../models');

const { Op, fn, col, where } = require('sequelize');

const { normalizeModuleKey, getModuleSearchValues, getPermissionSearchValues } = require('../utils/permissions.helper');



/**

 * Helper function to check if user is Super Administrator

 */

const isSuperAdministrator = (user) => {

  return user && user.roles && user.roles.includes('Super Administrador');

};



/**

 * Helper function to check if user is Administrator

 */

const isAdministrator = (user) => {

  return user && user.roles && user.roles.includes('Administrador');

};



/**

 * Middleware para verificar token JWT desde cookies

 */

const authenticateToken = (req, res, next) => {
  logger.info('[AUTH] Verifying request', {
    method: req.method,
    url: req.url,
    hasAccessToken: !!req.cookies.accessToken,
    hasRefreshToken: !!req.cookies.refreshToken
  });

  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      logger.warn('[AUTH] No access token in cookies for URL:', { method: req.method, url: req.url });
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = jwtUtils.verifyAccessToken(accessToken);

    if (!decoded) {
      logger.warn('[AUTH] Invalid token for URL:', { method: req.method, url: req.url });
      return res.status(401).json({
        success: false,
        message: 'Token invalido'
      });
    }

    logger.info('[AUTH] Token verified', {
      userId: decoded.id,
      email: decoded.email,
      method: req.method,
      url: req.url
    });

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('[AUTH] Error authenticating token', { error: error.message, url: req.url });
    return res.status(403).json({
      success: false,
      message: 'Token invalido o expirado'
    });
  }
};



// VERSIÃN v2.1 - Control de acceso unificado con nombres de roles largos

/**

 * Middleware NEW para verificar roles especÃ­ficos

 * Usa comparaciÃ³n directa de nombres largos: "Super Administrador", "Administrador"

 */

const authorizeRoles = (allowedRoles) => {

  return (req, res, next) => {

    try {

      if (!req.user) {

        return res.status(403).json({

          success: false,

          message: 'Usuario no autenticado'

        });

      }



      if (!req.user.roles || req.user.roles.length === 0) {

        return res.status(403).json({

          success: false,

          message: 'No tienes permisos para realizar esta acciÃ³n'

        });

      }



      // Comparar directamente los roles tal como vienen en el JWT

      const hasRequiredRole = req.user.roles.some(role => allowedRoles.includes(role));



      if (!hasRequiredRole) {

        logger.warn(`ROL DEBUG - Usuario: ${req.user.email}, Roles usuario: [${req.user.roles.join(', ')}], Roles requeridos: [${allowedRoles.join(', ')}], Tiene acceso: ${hasRequiredRole}`);

        return res.status(403).json({

          success: false,

          message: 'No tienes permisos para realizar esta acciÃ³n'

        });

      }



      logger.info(`Acceso autorizado para usuario ${req.user.email} (rol: ${req.user.roles.join(', ')})`);

      next();

    } catch (error) {

      logger.error('Error en autorizaciÃ³n:', error);

      return res.status(500).json({

        success: false,

        message: 'Error interno del servidor'

      });

    }

  };

};



/**

 * Middleware para verificar permisos especÃ­ficos en mÃ³dulos

 * ParÃ¡metros:

 * - moduleName: nombre del mÃ³dulo (ej: 'citas', 'inmuebles')

 * - requiredPermissions: array de permisos requeridos (ej: ['read', 'create']) o string para un solo permiso

 */

const authorizePermissions = (moduleName, requiredPermissions) => {

  return async (req, res, next) => {

    try {

      if (!req.user) {

        return res.status(403).json({

          success: false,

          message: 'Usuario no autenticado'

        });

      }

      // ✅ SKIP PERMISSIONS: Si la ruta marca que no requiere permisos, continuar
      if (req.skipPermissions === true) {
        logger.info(`Permisos omitidos para ruta ${req.path} - acceso concedido`);
        return next();
      }

      const roles = req.user.roles || [];



      // â Acceso completo para Super Administrador y Administrador

      if (roles.includes('Super Administrador') || roles.includes('Administrador')) {

        logger.info(`Acceso concedido a ${req.user.email} para mÃ³dulo ${moduleName} (full access para Admin)`);

        return next();

      }



        // Para usuarios normales, verificar permisos en la base de datos

        const normalizedModule = normalizeModuleKey(moduleName);

        if (!normalizedModule) {

          return res.status(403).json({

            success: false,

            message: 'El mÃ³dulo solicitado no es vÃ¡lido'

          });

        }



        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

        const normalizedPermissions = getPermissionSearchValues(permissions);



      const rolesDelUsuario = await Rol.findAll({

        where: { nombre_rol: { [Op.in]: roles }, estado: true },

        attributes: ['id_rol']

      });



      if (rolesDelUsuario.length === 0) {

        return res.status(403).json({

          success: false,

          message: 'No tienes permisos para acceder a este mÃ³dulo'

        });

      }



      const rolIds = rolesDelUsuario.map(rol => rol.id_rol);



        const moduleValues = getModuleSearchValues(normalizedModule);

        const whereConditions = [

          { id_rol: { [Op.in]: rolIds } },

          where(fn('LOWER', col('modulo')), { [Op.in]: moduleValues }),

          { estado: true }

        ];



        if (normalizedPermissions.length > 0) {

          whereConditions.push(

            where(fn('LOWER', col('permiso')), { [Op.in]: normalizedPermissions })

          );

        }



        const permisoEncontrado = await Permiso.findOne({

          where: {

            [Op.and]: whereConditions

          }

        });



      const hasPermission = !!permisoEncontrado;



      if (!hasPermission) {

        logger.warn(`Permiso denegado - Usuario: ${req.user.email}, Módulo: ${normalizedModule}, Permisos requeridos: [${permissions.join(', ')}]`);

        return res.status(403).json({

          success: false,

          message: 'No tienes permisos para acceder a este mÃ³dulo'

        });

      }



      logger.info(`Acceso concedido - Usuario: ${req.user.email}, Módulo: ${normalizedModule}, Permisos: [${permissions.join(', ')}]`);

      next();



    } catch (error) {

      logger.error('Error verificando permisos:', error);

      return res.status(500).json({

        success: false,

        message: 'Error interno del servidor verificando permisos'

      });

    }

  };

};



/**

 * Middleware opcional para autenticaciÃ³n desde cookies

 */

const optionalAuth = (req, res, next) => {

  try {

    // Verificar si hay cookies de autenticaciÃ³n

    const accessToken = req.cookies.accessToken;



    if (accessToken) {

      try {

        const decoded = jwtUtils.verifyAccessToken(accessToken);



        if (decoded) {

          req.user = {

            id: decoded.id,

            email: decoded.email,

            roles: decoded.roles || [],

            es_administrativo: decoded.es_administrativo || false

          };



          logger.info(`Usuario opcionalmente autenticado: ${req.user.email}`);

        }

      } catch (error) {

        logger.warn('Token opcional en cookie invÃ¡lido, continuando sin autenticaciÃ³n');

      }

    }



    next();

  } catch (error) {

    logger.error('Error en autenticaciÃ³n opcional:', error);

    next();

  }

};



module.exports = {

  authenticateToken,

  authorizeRoles,

  authorizePermissions,

  optionalAuth,

  isSuperAdministrator,

  isAdministrator

};
