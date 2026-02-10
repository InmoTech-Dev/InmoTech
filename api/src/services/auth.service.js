const crypto = require('crypto');
const { Persona, Acceso, PersonasRol, Rol, Administrativo } = require('../models');
const { sequelize } = require('../config/database');
const bcryptUtils = require('../utils/bcrypt');
const jwtUtils = require('../utils/jwt');
const logger = require('../utils/logger');
const emailService = require('./email.service');

const normalizeEmail = (email = '') =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const buildEmailCondition = (email) =>
  sequelize.where(sequelize.fn('LOWER', sequelize.col('correo')), email);

const PASSWORD_RESET_TTL = 60 * 60 * 1000;
const passwordResetTokens = new Map();

class AuthService {
  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} Usuario creado con tokens
   */
  async registrarUsuario(userData) {
    const result = await sequelize.transaction(async (t) => {
      try {
        const { email, password } = userData;
        const normalizedEmail = normalizeEmail(email);

        // Verificar si el email ya existe
        const personaExistente = await Persona.findOne({
          where: buildEmailCondition(normalizedEmail),
          transaction: t
        });

        if (personaExistente) {
          throw new Error('El correo electrÃ³nico ya estÃ¡ registrado');
        }

        // Crear persona
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

        // Crear acceso
        const hashedPassword = await bcryptUtils.hashPassword(password);
        await Acceso.create({
          id_persona: nuevaPersona.id_persona,
          contrasena: hashedPassword
        }, { transaction: t });

        // Asignar rol por defecto (Usuario)
        const rolUsuario = await Rol.findOne({
          where: { nombre_rol: 'Usuario' },
          transaction: t
        });

        if (rolUsuario) {
          await PersonasRol.create({
            id_persona: nuevaPersona.id_persona,
            id_rol: rolUsuario.id_rol
          }, { transaction: t });
        }

        logger.info(`Usuario registrado: ${email}`);
        const userRoles = rolUsuario ? [rolUsuario.nombre_rol] : [];

        // Generar tokens
        const payload = {
          id: nuevaPersona.id_persona,
          email: nuevaPersona.correo,
          roles: userRoles
        };

        const tokens = jwtUtils.generateTokens(payload);

        return {
          user: {
            id: nuevaPersona.id_persona,
            email: nuevaPersona.correo,
            nombre_completo: nuevaPersona.nombre_completo,
            apellido_completo: nuevaPersona.apellido_completo,
            roles: payload.roles
          },
          ...tokens
        };

      } catch (error) {
        logger.error('Error en registro de usuario:', error);
        throw error;
      }
    });

    return result;
  }

  /**
   * Inicia sesiÃ³n de usuario
   * @param {string} email - Correo electrÃ³nico
   * @param {string} password - contraseña
   * @returns {Promise<Object>} Usuario autenticado con tokens
   */
  async iniciarSesion(email, password) {
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        throw new Error('Credenciales inv\u00e1lidas');
      }

      // Buscar persona por email
      const persona = await Persona.findOne({
        where: buildEmailCondition(normalizedEmail),
        include: [
          {
            model: Acceso,
            as: 'acceso',
            required: true
          },
          {
            model: Rol,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol', 'es_rol_administrativo']
          },
          {
            model: Administrativo,
            as: 'administrativo',
            required: false,
            where: { estado_laboral: 'Activo' }
          }
        ]
      });

      if (!persona) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        throw error;
      }

      // Verificar contraseña
      const isValidPassword = await bcryptUtils.verifyPassword(password, persona.acceso.contrasena);

      if (!isValidPassword) {
        const error = new Error('Credenciales inválidas');
        error.status = 401;
        throw error;
      }

      // Actualizar Ãºltimo acceso
      await Acceso.update(
        { ultimo_acceso: new Date() },
        { where: { id_persona: persona.id_persona } }
      );

      // Preparar roles y determinar si es administrativo
      const roles = persona.roles ? persona.roles.map(rol => rol.nombre_rol) : [];
      const es_administrativo = persona.roles ?
        persona.roles.some(rol => rol.es_rol_administrativo) && persona.administrativo !== null :
        false;

      // Generar tokens
      const payload = {
        id: persona.id_persona,
        email: persona.correo,
        roles: roles,
        es_administrativo: es_administrativo
      };

      const tokens = jwtUtils.generateTokens(payload);

      logger.info(`Usuario iniciÃ³ sesiÃ³n: ${email} (Administrativo: ${es_administrativo})`);

      return {
        user: {
          id: persona.id_persona,
          email: persona.correo,
          nombre_completo: persona.nombre_completo,
          apellido_completo: persona.apellido_completo,
          roles: roles,
          es_administrativo: es_administrativo
        },
        ...tokens
      };

    } catch (error) {
      logger.error('Error en inicio de sesiÃ³n:', error);
      throw error;
    }
  }

  /**
   * Refresca el token de acceso
   * @param {string} refreshToken - Token de refresco
   * @returns {Promise<Object>} Nuevos tokens
   */
  async refrescarToken(refreshToken) {
    try {
      // Verificar token de refresco
      const decoded = jwtUtils.verifyRefreshToken(refreshToken);

      // Buscar usuario y roles
      const persona = await Persona.findOne({
        where: { id_persona: decoded.id },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol', 'es_rol_administrativo']
          },
          {
            model: Administrativo,
            as: 'administrativo',
            required: false,
            where: { estado_laboral: 'Activo' }
          }
        ]
      });

      if (!persona) {
        const error = new Error('Credenciales invǭlidas');
        error.status = 401;
        throw error;
      }

      // Verificar contraseña
      const isValidPassword = await bcryptUtils.verifyPassword(password, persona.acceso.contrasena);

      if (!isValidPassword) {
        const error = new Error('Credenciales invǭlidas');
        error.status = 401;
        throw error;
      }

      // Actualizar contraseña
      await acceso.update({ contrasena: hashedNewPassword });

      logger.info(`contraseña cambiada para usuario ID: ${userId}`);

      return true;

    } catch (error) {
      logger.error('Error cambiando contraseña:', error);
      throw error;
    }
  }

  /**
   * Obtiene el perfil del usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Datos del perfil
   */
  async obtenerPerfil(userId) {
    try {
      const persona = await Persona.findOne({
        where: { id_persona: userId },
        include: [
          {
            model: Rol,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id_rol', 'nombre_rol', 'descripcion']
          }
        ]
      });

      if (!persona) {
        throw new Error('Usuario no encontrado');
      }

      return {
        id: persona.id_persona,
        primer_nombre: persona.primer_nombre,
        segundo_nombre: persona.segundo_nombre,
        primer_apellido: persona.primer_apellido,
        segundo_apellido: persona.segundo_apellido,
        correo: persona.correo,
        telefono: persona.telefono,
        fecha_registro: persona.fecha_registro,
        roles: persona.roles || []
      };

    } catch (error) {
      logger.error('Error obteniendo perfil:', error);
      throw error;
    }
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
    await acceso.update({ contrasena: hashedPassword });
    passwordResetTokens.delete(token);

    logger.info(`Contraseña restablecida para usuario ${record.personId}`);
    return true;
  }

}

module.exports = new AuthService();



