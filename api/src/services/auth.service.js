const crypto = require('crypto');
const { Persona, Acceso, PersonasRol, Rol, Administrativo, Permiso } = require('../models');
const { sequelize } = require('../config/database');
const bcryptUtils = require('../utils/bcrypt');
const jwtUtils = require('../utils/jwt');
const logger = require('../utils/logger');
const emailService = require('./email.service');
const { normalizeModuleKey, normalizePermissionKey } = require('../utils/permissions.helper');

const normalizeEmail = (email = '') =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const buildEmailCondition = (email) =>
  sequelize.where(sequelize.fn('LOWER', sequelize.col('correo')), email);

const PASSWORD_RESET_TTL = 60 * 60 * 1000;
const passwordResetTokens = new Map();

const buildRoleInclude = () => ({
  model: Rol,
  as: 'roles',
  through: {
    attributes: ['estado'],
    where: { estado: true }
  },
  where: { estado: true },
  required: false,
  attributes: ['id_rol', 'nombre_rol', 'es_rol_administrativo'],
  include: [
    {
      model: Permiso,
      as: 'permisos',
      where: { estado: true },
      required: false,
      attributes: ['modulo', 'permiso', 'estado']
    }
  ]
});

const buildAdministrativoInclude = () => ({
  model: Administrativo,
  as: 'administrativo',
  required: false,
  where: { estado_laboral: 'Activo' }
});

const buildPermissionsFromRoles = (roles = []) => {
  const permissions = {};

  roles.forEach((role) => {
    const rolePermissions = Array.isArray(role?.permisos) ? role.permisos : [];
    rolePermissions.forEach((permission) => {
      if (!permission || permission.estado === false) return;

      const normalizedModule =
        normalizeModuleKey(permission.modulo) ||
        (typeof permission.modulo === 'string' ? permission.modulo.trim().toLowerCase() : null);
      const normalizedPermission =
        normalizePermissionKey(permission.permiso) ||
        (typeof permission.permiso === 'string' ? permission.permiso.trim().toLowerCase() : null);

      if (!normalizedModule || !normalizedPermission) return;

      if (!permissions[normalizedModule]) {
        permissions[normalizedModule] = {};
      }
      permissions[normalizedModule][normalizedPermission] = true;
    });
  });

  return permissions;
};

const buildAuthUser = (persona) => {
  const activeRoles = Array.isArray(persona?.roles)
    ? persona.roles.filter((role) => role && role.estado !== false && role?.Personas_rol?.estado !== false)
    : [];

  const roles = activeRoles.map((role) => role.nombre_rol);
  const hasAdministrativeRole = activeRoles.some((role) => role.es_rol_administrativo);
  const es_administrativo = hasAdministrativeRole && !!persona?.administrativo;
  const permisos = buildPermissionsFromRoles(activeRoles);

  return {
    id: persona.id_persona,
    id_persona: persona.id_persona,
    email: persona.correo,
    correo: persona.correo,
    nombre_completo: persona.nombre_completo,
    apellido_completo: persona.apellido_completo,
    roles,
    es_administrativo,
    permisos
  };
};

class AuthService {
  async registrarUsuario(userData) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const { email, password } = userData;
        const normalizedEmail = normalizeEmail(email);

        const personaExistente = await Persona.findOne({
          where: buildEmailCondition(normalizedEmail),
          transaction: t
        });

        if (personaExistente) {
          throw new Error('El correo electrónico ya está registrado');
        }

        const nuevaPersona = await Persona.create({
          tipo_documento: userData.tipo_documento,
          numero_documento: userData.numero_documento,
          nombre_completo: userData.nombre_completo,
          apellido_completo: userData.apellido_completo,
          correo: normalizedEmail,
          telefono: userData.telefono,
          tiene_cuenta: true,
          estado: true
        }, { transaction: t });

        const hashedPassword = await bcryptUtils.hashPassword(password);
        await Acceso.create({
          id_persona: nuevaPersona.id_persona,
          contrasena: hashedPassword
        }, { transaction: t });

        const rolUsuario = await Rol.findOne({
          where: { nombre_rol: 'Usuario', estado: true },
          transaction: t
        });

        if (rolUsuario) {
          await PersonasRol.create({
            id_persona: nuevaPersona.id_persona,
            id_rol: rolUsuario.id_rol,
            estado: true
          }, { transaction: t });
        }

        const userRoles = rolUsuario ? [rolUsuario.nombre_rol] : [];
        const userPayload = {
          id: nuevaPersona.id_persona,
          id_persona: nuevaPersona.id_persona,
          email: nuevaPersona.correo,
          correo: nuevaPersona.correo,
          nombre_completo: nuevaPersona.nombre_completo,
          apellido_completo: nuevaPersona.apellido_completo,
          roles: userRoles,
          es_administrativo: false,
          permisos: {}
        };

        const payload = {
          id: nuevaPersona.id_persona,
          email: nuevaPersona.correo,
          roles: userRoles,
          es_administrativo: false
        };

        const tokens = jwtUtils.generateTokens(payload);
        logger.info(`Usuario registrado: ${email}`);

        return {
          user: userPayload,
          ...tokens
        };
      } catch (error) {
        logger.error('Error en registro de usuario:', error);
        throw error;
      }
    });

    return result;
  }

  async iniciarSesion(email, password) {
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      const persona = await Persona.findOne({
        where: buildEmailCondition(normalizedEmail),
        include: [
          {
            model: Acceso,
            as: 'acceso',
            required: true
          },
          buildRoleInclude(),
          buildAdministrativoInclude()
        ]
      });

      if (!persona || persona.estado === false) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      const isValidPassword = await bcryptUtils.verifyPassword(password, persona.acceso.contrasena);
      if (!isValidPassword) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      await Acceso.update(
        { ultimo_acceso: new Date() },
        { where: { id_persona: persona.id_persona } }
      );

      const authUser = buildAuthUser(persona);
      const payload = {
        id: persona.id_persona,
        email: persona.correo,
        roles: authUser.roles,
        es_administrativo: authUser.es_administrativo
      };

      const tokens = jwtUtils.generateTokens(payload);
      logger.info(`Usuario inició sesión: ${email} (Administrativo: ${authUser.es_administrativo})`);

      return {
        user: authUser,
        ...tokens
      };
    } catch (error) {
      logger.error('Error en inicio de sesión:', error);
      throw error;
    }
  }

  async refrescarToken(refreshToken) {
    try {
      if (!refreshToken) {
        const error = new Error('Token de refresco requerido');
        error.status = 401;
        error.code = 'REFRESH_TOKEN_REQUIRED';
        throw error;
      }

      const decoded = jwtUtils.verifyRefreshToken(refreshToken);

      const persona = await Persona.findOne({
        where: { id_persona: decoded.id, estado: true },
        include: [
          buildRoleInclude(),
          buildAdministrativoInclude()
        ]
      });

      if (!persona) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        throw error;
      }

      const authUser = buildAuthUser(persona);
      const payload = {
        id: persona.id_persona,
        email: persona.correo,
        roles: authUser.roles,
        es_administrativo: authUser.es_administrativo
      };

      return {
        ...jwtUtils.generateTokens(payload),
        user: authUser
      };
    } catch (error) {
      if (!error.status) {
        error.status = 401;
      }
      if (!error.code) {
        error.code = 'INVALID_REFRESH_TOKEN';
      }
      logger.error('Error refrescando token:', error);
      throw error;
    }
  }

  async obtenerPerfil(userId) {
    try {
      const persona = await Persona.findOne({
        where: { id_persona: userId },
        include: [
          buildRoleInclude(),
          buildAdministrativoInclude()
        ]
      });

      if (!persona) {
        throw new Error('Usuario no encontrado');
      }

      if (persona.estado === false) {
        throw new Error('Usuario inactivo o deshabilitado');
      }

      const authUser = buildAuthUser(persona);
      const hasAdministrativeRole = Array.isArray(persona.roles)
        ? persona.roles.some((rol) => rol.es_rol_administrativo === true)
        : false;

      if (hasAdministrativeRole && !authUser.es_administrativo) {
        throw new Error('Acceso administrativo revocado');
      }

      return authUser;
    } catch (error) {
      logger.error('Error obteniendo perfil:', error);
      throw error;
    }
  }

  async cambiarContrasena(userId, currentPassword, newPassword) {
    try {
      const acceso = await Acceso.findOne({
        where: { id_persona: userId }
      });

      if (!acceso) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }

      const isValidPassword = await bcryptUtils.verifyPassword(currentPassword, acceso.contrasena);
      if (!isValidPassword) {
        const error = new Error('La contraseña actual es incorrecta');
        error.status = 400;
        throw error;
      }

      const hashedNewPassword = await bcryptUtils.hashPassword(newPassword);
      await acceso.update({
        contrasena: hashedNewPassword,
        ultimo_cambio_password: new Date()
      });

      logger.info(`Contraseña cambiada para usuario ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error cambiando contraseña:', error);
      throw error;
    }
  }

  async obtenerUltimoCambioPassword(userId) {
    const acceso = await Acceso.findOne({
      where: { id_persona: userId },
      attributes: ['ultimo_cambio_password']
    });

    if (!acceso) {
      throw new Error('Usuario no encontrado');
    }

    return acceso.ultimo_cambio_password || null;
  }

  async solicitarRecuperacionContrasena(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      const error = new Error('Correo inválido');
      error.status = 400;
      throw error;
    }

    const persona = await Persona.findOne({
      where: buildEmailCondition(normalizedEmail),
      include: [{ model: Acceso, as: 'acceso', required: false }]
    });

    if (!persona) {
      const error = new Error('No encontramos una cuenta registrada con este correo.');
      error.status = 404;
      throw error;
    }

    const token = crypto.randomBytes(32).toString('hex');
    passwordResetTokens.set(token, {
      personId: persona.id_persona,
      expiresAt: Date.now() + PASSWORD_RESET_TTL
    });

    setTimeout(() => passwordResetTokens.delete(token), PASSWORD_RESET_TTL);

    await emailService.sendPasswordResetEmail({
      to: persona.correo,
      token
    });

    logger.info(`Solicitud de recuperación registrada para ${email}`);
    return true;
  }

  async validarTokenRecuperacion(token) {
    const record = passwordResetTokens.get(token);
    if (!record) {
      const error = new Error('Token inválido o expirado.');
      error.status = 400;
      throw error;
    }

    if (record.expiresAt < Date.now()) {
      passwordResetTokens.delete(token);
      const error = new Error('El token ha expirado.');
      error.status = 400;
      throw error;
    }

    return {
      valido: true,
      expira_en: new Date(record.expiresAt).toISOString()
    };
  }

  async restablecerContrasena(token, newPassword) {
    const record = passwordResetTokens.get(token);
    if (!record) {
      const error = new Error('Token inválido o expirado.');
      error.status = 400;
      throw error;
    }

    if (record.expiresAt < Date.now()) {
      passwordResetTokens.delete(token);
      const error = new Error('El token ha expirado.');
      error.status = 400;
      throw error;
    }

    const acceso = await Acceso.findOne({ where: { id_persona: record.personId } });
    if (!acceso) {
      const error = new Error('No se encontró el usuario para restablecer la contraseña.');
      error.status = 404;
      throw error;
    }

    const hashedPassword = await bcryptUtils.hashPassword(newPassword);
    await acceso.update({
      contrasena: hashedPassword,
      ultimo_cambio_password: new Date()
    });
    passwordResetTokens.delete(token);

    logger.info(`Contraseña restablecida para usuario ${record.personId}`);
    return true;
  }
}

module.exports = new AuthService();
