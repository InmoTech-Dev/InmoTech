const crypto = require('crypto');
const { Persona, Acceso, Rol, Administrativo, Permiso } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const bcryptUtils = require('../utils/bcrypt');
const jwtUtils = require('../utils/jwt');
const logger = require('../utils/logger');
const emailService = require('./email.service');
const { normalizeModuleKey, normalizePermissionKey } = require('../utils/permissions.helper');

const normalizeEmail = (email = '') =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const buildEmailCondition = (email) =>
  sequelize.where(sequelize.fn('LOWER', sequelize.col('correo')), email);

const BASIC_PERSONA_ATTRIBUTES = [
  'id_persona',
  'correo',
  'estado',
  'nombre_completo',
  'apellido_completo',
  'telefono',
  'foto_perfil_url',
  'foto_public_id',
  'fecha_registro',
  'tipo_documento',
  'numero_documento',
  'telefono'
];

const BASIC_ACCESO_ATTRIBUTES = ['id_persona', 'contrasena'];

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

const buildRoleIncludeBasic = () => ({
  model: Rol,
  as: 'roles',
  through: {
    attributes: ['estado'],
    where: { estado: true }
  },
  where: { estado: true },
  required: false,
  attributes: ['id_rol', 'nombre_rol', 'es_rol_administrativo']
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

  // LOGIC FIX: A Super Administrator is ALWAYS administrative, 
  // regardless of whether they have a record in the optional 'Administrativos' table.
  const isSuperAdmin = roles.includes('Super Administrador');
  const es_administrativo = hasAdministrativeRole && (isSuperAdmin || !!persona?.administrativo);

  const permisos = buildPermissionsFromRoles(activeRoles);

  return {
    id: persona.id_persona,
    id_persona: persona.id_persona,
    email: persona.correo,
    correo: persona.correo,
    nombre_completo: persona.nombre_completo,
    apellido_completo: persona.apellido_completo,
    telefono: persona.telefono,
    foto_perfil_url: persona.foto_perfil_url,
    foto_public_id: persona.foto_public_id,
    fecha_registro: persona.fecha_registro,
    tipo_documento: persona.tipo_documento,
    numero_documento: persona.numero_documento,
    telefono: persona.telefono,
    roles,
    es_administrativo,
    permisos
  };
};

const buildAccountDisabledError = () => {
  const error = new Error('Tu cuenta esta deshabilitada. Comunicate con soporte o con un administrador.');
  error.status = 423;
  error.code = 'ACCOUNT_DISABLED';
  return error;
};

const buildAdminRevokedError = () => {
  const error = new Error('Tu acceso administrativo ha sido revocado.');
  error.status = 403;
  error.code = 'ADMIN_ACCESS_REVOKED';
  return error;
};

class AuthService {
  async buildAuthContextByPersonaId(personaId) {
    const personaBase = await Persona.findOne({
      where: { id_persona: personaId, estado: true },
      attributes: BASIC_PERSONA_ATTRIBUTES,
      raw: true
    });

    if (!personaBase) return null;

    const personaRoles = await Persona.findOne({
      where: { id_persona: personaId, estado: true },
      attributes: ['id_persona'],
      include: [buildRoleIncludeBasic()]
    });

    const roleList = Array.isArray(personaRoles?.roles) ? personaRoles.roles : [];
    const roleIds = roleList.map((role) => role.id_rol).filter(Boolean);

    const permisosRows = roleIds.length
      ? await Permiso.findAll({
        where: {
          id_rol: { [Op.in]: roleIds },
          estado: true
        },
        attributes: ['id_rol', 'modulo', 'permiso', 'estado'],
        raw: true
      })
      : [];

    const permissionsByRole = new Map();
    permisosRows.forEach((permission) => {
      const roleId = permission.id_rol;
      if (!permissionsByRole.has(roleId)) {
        permissionsByRole.set(roleId, []);
      }
      permissionsByRole.get(roleId).push({
        modulo: permission.modulo,
        permiso: permission.permiso,
        estado: permission.estado
      });
    });

    const normalizedRoles = roleList.map((role) => {
      const plainRole = role.get ? role.get({ plain: true }) : role;
      const throughState = plainRole?.Personas_rol || { estado: true };
      return {
        ...plainRole,
        Personas_rol: throughState,
        permisos: permissionsByRole.get(plainRole.id_rol) || []
      };
    });

    const administrativo = await Administrativo.findOne({
      where: { id_persona: personaId, estado_laboral: 'Activo' },
      attributes: ['id_administrativo', 'id_persona'],
      raw: true
    });

    const personaForAuth = {
      ...personaBase,
      roles: normalizedRoles,
      administrativo: administrativo || null
    };

    return {
      persona: personaBase,
      authUser: buildAuthUser(personaForAuth),
      hasAdministrativeRole: roleList.some((role) => role?.es_rol_administrativo === true)
    };
  }

  async iniciarSesion(email, password) {
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        const error = new Error('Credenciales invalidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Fase A: consulta minima para validar credenciales rapidamente.
      let persona = await Persona.findOne({
        where: { correo: normalizedEmail },
        attributes: BASIC_PERSONA_ATTRIBUTES,
        include: [
          {
            model: Acceso,
            as: 'acceso',
            required: true,
            attributes: BASIC_ACCESO_ATTRIBUTES
          }
        ]
      });

      // Fallback para collations case-sensitive.
      if (!persona) {
        persona = await Persona.findOne({
          where: buildEmailCondition(normalizedEmail),
          attributes: BASIC_PERSONA_ATTRIBUTES,
          include: [
            {
              model: Acceso,
              as: 'acceso',
              required: true,
              attributes: BASIC_ACCESO_ATTRIBUTES
            }
          ]
        });
      }

      if (!persona) {
        const error = new Error('Credenciales invalidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      if (persona.estado === false) {
        throw buildAccountDisabledError();
      }

      const isValidPassword = await bcryptUtils.verifyPassword(password, persona.acceso.contrasena);
      if (!isValidPassword) {
        const error = new Error('Credenciales invalidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Fase B: cargar contexto de autorizacion en consultas pequenas.
      const authContext = await this.buildAuthContextByPersonaId(persona.id_persona);
      if (!authContext) {
        const error = new Error('Credenciales invalidas');
        error.status = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }
      const { persona: personaPerfil, authUser, hasAdministrativeRole } = authContext;

      if (hasAdministrativeRole && !authUser.es_administrativo) {
        throw buildAdminRevokedError();
      }

      // No bloquea la respuesta de login.
      Acceso.update(
        { ultimo_acceso: new Date() },
        { where: { id_persona: persona.id_persona } }
      ).catch((updateError) => {
        logger.warn(
          `[Auth] No se pudo actualizar ultimo_acceso para id_persona ${persona.id_persona}: ${updateError.message}`
        );
      });

      const payload = {
        id: personaPerfil.id_persona,
        email: personaPerfil.correo,
        roles: authUser.roles,
        es_administrativo: authUser.es_administrativo
      };

      const tokens = jwtUtils.generateTokens(payload);
      logger.info(`Usuario inicio sesion: ${email} (Administrativo: ${authUser.es_administrativo})`);

      return {
        user: authUser,
        ...tokens
      };
    } catch (error) {
      logger.error('Error en inicio de sesion:', error);
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
      const personaEstado = await Persona.findByPk(decoded.id, {
        attributes: ['id_persona', 'estado']
      });

      if (!personaEstado) {
        const error = new Error('Credenciales invalidas');
        error.status = 401;
        throw error;
      }

      if (personaEstado.estado === false) {
        throw buildAccountDisabledError();
      }

      const authContext = await this.buildAuthContextByPersonaId(decoded.id);
      if (!authContext) {
        const error = new Error('Credenciales invalidas');
        error.status = 401;
        throw error;
      }
      const { persona, authUser, hasAdministrativeRole } = authContext;

      if (hasAdministrativeRole && !authUser.es_administrativo) {
        throw buildAdminRevokedError();
      }

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
      const personaEstado = await Persona.findByPk(userId, {
        attributes: ['id_persona', 'estado']
      });

      if (!personaEstado) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }

      if (personaEstado.estado === false) {
        throw buildAccountDisabledError();
      }

      const authContext = await this.buildAuthContextByPersonaId(userId);
      if (!authContext) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
      }
      const { authUser, hasAdministrativeRole } = authContext;

      if (hasAdministrativeRole && !authUser.es_administrativo) {
        throw buildAdminRevokedError();
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
        const error = new Error('La contrasena actual es incorrecta');
        error.status = 400;
        throw error;
      }

      const hashedNewPassword = await bcryptUtils.hashPassword(newPassword);
      await acceso.update({
        contrasena: hashedNewPassword,
        ultimo_cambio_password: new Date()
      });

      logger.info(`Contrasena cambiada para usuario ID: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error cambiando contrasena:', error);
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
      const error = new Error('Correo invalido');
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

    logger.info(`Solicitud de recuperacion registrada para ${email}`);
    return true;
  }

  async validarTokenRecuperacion(token) {
    const record = passwordResetTokens.get(token);
    if (!record) {
      const error = new Error('Token invalido o expirado.');
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
      const error = new Error('Token invalido o expirado.');
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
      const error = new Error('No se encontro el usuario para restablecer la contrasena.');
      error.status = 404;
      throw error;
    }

    const hashedPassword = await bcryptUtils.hashPassword(newPassword);
    await acceso.update({
      contrasena: hashedPassword,
      ultimo_cambio_password: new Date()
    });
    passwordResetTokens.delete(token);

    logger.info(`Contrasena restablecida para usuario ${record.personId}`);
    return true;
  }
}

module.exports = new AuthService();
