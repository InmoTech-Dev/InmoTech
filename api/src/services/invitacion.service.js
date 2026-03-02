const crypto = require('crypto');
const { Op } = require('sequelize');
const { Invitacion, Persona, Acceso, Rol, PersonasRol, sequelize } = require('../models');
const bcryptUtils = require('../utils/bcrypt');
const logger = require('../utils/logger');
const emailService = require('./email.service');

const INVITE_TTL_HOURS = Number(process.env.INVITATION_TTL_HOURS || 24);
const INVITE_MAX_INTENTOS = Number(process.env.INVITATION_MAX_INTENTOS || 5);
const INVITE_MAX_REENVIOS = Number(process.env.INVITATION_MAX_REENVIOS || 3);
const INVITE_TYPES = {
  ADMIN: 'admin_invite',
  USER: 'user_invite'
};

class InvitacionService {
  generarToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generarCodigo6d() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async crearInvitacion({
    id_persona,
    creado_por,
    tipo = null,
    reenvios = 0,
    rol_asignado = null,
    es_administrativo = null,
    deferEmail = false
  }) {
    // Obtener la persona con sus roles si no se proporcionó el tipo o es_administrativo
    const persona = await Persona.findByPk(id_persona, {
      include: [{ model: Rol, as: 'roles' }]
    });
    if (!persona) throw new Error('Persona no encontrada');

    // Determinar si es administrativo basado en roles si no se especificó
    let esAdminInvite = es_administrativo;
    let inviteType = tipo;

    if (esAdminInvite === null || !inviteType) {
      const roles = persona.roles || [];
      const nombreRoles = roles.map(r => r.nombre_rol);
      const esAdminReal = nombreRoles.some(r => 
        ['Administrador', 'Super Administrador', 'Empleado', 'Agente', 'Gerente', 'Supervisor'].includes(r)
      );

      if (esAdminInvite === null) esAdminInvite = esAdminReal;
      if (!inviteType) inviteType = esAdminReal ? INVITE_TYPES.ADMIN : INVITE_TYPES.USER;
      if (!rol_asignado) rol_asignado = nombreRoles[0] || (esAdminReal ? 'Administrativo' : 'Usuario');
    }

    const token = this.generarToken();
    const token_hash = this.hashToken(token);
    const codigo_6d = this.generarCodigo6d();
    const expira_en = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    // Invalidar invitaciones previas activas del mismo tipo.
    await Invitacion.update(
      { usado_en: new Date() },
      { where: { id_persona, tipo: inviteType, usado_en: null, expira_en: { [Op.gt]: new Date() } } }
    );

    await Invitacion.create({
      id_persona,
      tipo: inviteType,
      token_hash,
      codigo_6d,
      expira_en,
      creado_por,
      reenvios
    });

    const activationBase = process.env.INVITATION_URL_BASE || 'http://localhost:3000/activar';
    const activationLink = `${activationBase}?token=${encodeURIComponent(token)}`;

    const sendEmail = async () => emailService.enviarEmailInvitacion({
      email: persona.correo,
      nombre_completo: persona.nombre_completo,
      token,
      codigo_6d,
      expira_en,
      activationLink,
      rol_asignado: rol_asignado || (esAdminInvite ? 'Administrativo' : null),
      es_administrativo: esAdminInvite
    });

    if (deferEmail) {
      setImmediate(async () => {
        try {
          const deliveryResult = await sendEmail();
          logger.info('Invitacion enviada en background', {
            id_persona,
            tipo: inviteType,
            correo: persona.correo,
            intentos_envio: deliveryResult?.intentos_envio || 1
          });
        } catch (emailError) {
          logger.warn('Fallo envio diferido de invitacion', {
            id_persona,
            tipo: inviteType,
            correo: persona.correo,
            code: emailError?.code || null,
            reason: emailError?.reason || null,
            host: emailError?.host || null,
            error: emailError
          });
        }
      });

      logger.info(`Invitacion creada para persona ${id_persona} por ${creado_por || 'sistema'} (envio diferido)`);
      return {
        token,
        codigo_6d,
        expira_en,
        tipo: inviteType,
        reenvios,
        intentos_envio: 0,
        estado: 'pendiente_envio'
      };
    }

    let deliveryResult = null;
    try {
      deliveryResult = await sendEmail();
    } catch (emailError) {
      emailError.context = {
        id_persona,
        tipo: inviteType,
        expira_en,
        reenvios,
        correo: persona.correo
      };
      throw emailError;
    }

    logger.info(`Invitacion creada para persona ${id_persona} por ${creado_por || 'sistema'}`);
    return {
      token,
      codigo_6d,
      expira_en,
      tipo: inviteType,
      reenvios,
      intentos_envio: deliveryResult?.intentos_envio || 1
    };
  }

  async reenviar(token) {
    const token_hash = this.hashToken(token);
    const invitacion = await Invitacion.findOne({
      where: { token_hash },
      include: [{ model: Persona, as: 'persona', attributes: ['id_persona', 'correo', 'nombre_completo', 'estado'] }]
    });
    if (!invitacion) throw new Error('Invitacion no encontrada');
    // Permitir reenvío de cualquier tipo soportado (admin y user)
    if (invitacion.tipo !== INVITE_TYPES.ADMIN && invitacion.tipo !== INVITE_TYPES.USER) {
      throw new Error('Tipo de invitacion no soportado para reenvio');
    }

    const ahora = new Date();
    const expirada = invitacion.expira_en && ahora > invitacion.expira_en;
    const usada = Boolean(invitacion.usado_en);
    const intentosAgotados = invitacion.intentos >= INVITE_MAX_INTENTOS;
    const reenviosActuales = invitacion.reenvios || 0;
    const siguienteReenvio = reenviosActuales + 1;

    // Solo permitir reenvio si esta expirada, usada/invalida o intentos agotados.
    if (!expirada && !usada && !intentosAgotados) {
      throw new Error('La invitacion aun esta vigente, no es necesario reenviar');
    }

    if (siguienteReenvio > INVITE_MAX_REENVIOS) {
      await Persona.update(
        { estado: false },
        { where: { id_persona: invitacion.id_persona } }
      );
      throw new Error('La cuenta ha sido deshabilitada por superar el limite de reenvios');
    }

    return this.crearInvitacion({
      id_persona: invitacion.id_persona,
      creado_por: invitacion.creado_por || null,
      tipo: invitacion.tipo,
      reenvios: siguienteReenvio
    });
  }

  async validar(token) {
    const token_hash = this.hashToken(token);
    const invitacion = await Invitacion.findOne({
      where: { token_hash },
      include: [{ model: Persona, as: 'persona', attributes: ['id_persona', 'correo', 'nombre_completo'] }]
    });

    if (!invitacion) {
      throw new Error('Invitacion no encontrada o token invalido');
    }
    if (invitacion.usado_en) {
      throw new Error('Invitacion ya utilizada');
    }
    if (new Date() > invitacion.expira_en) {
      throw new Error('Invitacion expirada');
    }
    if (invitacion.intentos >= INVITE_MAX_INTENTOS) {
      throw new Error('Invitacion bloqueada por intentos fallidos');
    }

    return {
      id_persona: invitacion.id_persona,
      correo: invitacion.persona?.correo,
      nombre_completo: invitacion.persona?.nombre_completo,
      expira_en: invitacion.expira_en,
      tipo: invitacion.tipo
    };
  }

  async aceptar({ token, codigo_6d, password, ip, userAgent }) {
    const result = await sequelize.transaction(async (t) => {
      const token_hash = this.hashToken(token);
      const invitacion = await Invitacion.findOne({ 
        where: { token_hash },
        transaction: t 
      });

      if (!invitacion) throw new Error('Invitacion no encontrada o token invalido');
      if (invitacion.usado_en) throw new Error('Invitacion ya utilizada');
      if (new Date() > invitacion.expira_en) throw new Error('Invitacion expirada');
      if (invitacion.intentos >= INVITE_MAX_INTENTOS) throw new Error('Invitacion bloqueada por intentos fallidos');

      if (invitacion.codigo_6d !== codigo_6d) {
        await Invitacion.update(
          { intentos: invitacion.intentos + 1 },
          { where: { id_invitacion: invitacion.id_invitacion }, transaction: t }
        );
        throw new Error('Codigo de verificacion incorrecto');
      }

      const hashedPassword = await bcryptUtils.hashPassword(password);

      const existing = await Acceso.findOne({ 
        where: { id_persona: invitacion.id_persona },
        transaction: t
      });

      if (existing) {
        await existing.update({
          contrasena: hashedPassword,
          ultimo_cambio_password: new Date(),
          password_change_required: false
        }, { transaction: t });
      } else {
        await Acceso.create({
          id_persona: invitacion.id_persona,
          contrasena: hashedPassword,
          ultimo_cambio_password: new Date(),
          password_change_required: false
        }, { transaction: t });
      }

      await Persona.update(
        { tiene_cuenta: true, correo_verificado: true },
        { where: { id_persona: invitacion.id_persona }, transaction: t }
      );

      // Asegurar rol Usuario asignado.
      const rolUsuario = await Rol.findOne({ 
        where: { nombre_rol: 'Usuario' },
        transaction: t
      });

      if (rolUsuario) {
        const yaTieneRol = await PersonasRol.findOne({
          where: { id_persona: invitacion.id_persona, id_rol: rolUsuario.id_rol },
          transaction: t
        });
        if (!yaTieneRol) {
          await PersonasRol.create({
            id_persona: invitacion.id_persona,
            id_rol: rolUsuario.id_rol
          }, { transaction: t });
        }
      }

      await Invitacion.update(
        {
          usado_en: new Date(),
          intentos: invitacion.intentos,
          ip_uso: ip || null,
          ua_uso: userAgent || null
        },
        { where: { id_invitacion: invitacion.id_invitacion }, transaction: t }
      );

      return { id_persona: invitacion.id_persona };
    });

    return result;
  }
}

module.exports = new InvitacionService();
