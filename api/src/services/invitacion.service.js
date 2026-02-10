const crypto = require('crypto');
const { Op } = require('sequelize');
const { Invitacion, Persona, Acceso, Rol, PersonasRol } = require('../models');
const bcryptUtils = require('../utils/bcrypt');
const logger = require('../utils/logger');
const emailService = require('./email.service');

const INVITE_TTL_HOURS = Number(process.env.INVITATION_TTL_HOURS || 24);
const INVITE_MAX_INTENTOS = Number(process.env.INVITATION_MAX_INTENTOS || 5);
const INVITE_MAX_REENVIOS = Number(process.env.INVITATION_MAX_REENVIOS || 3);
const VERIFICATION_MAX_CODES = Math.max(1, Number(process.env.EMAIL_VERIFICATION_MAX_CODES || 5));
const INVITE_TYPES = {
  ADMIN: 'admin_invite',
  SIGNUP_VERIFY: 'signup_verify'
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

  async crearInvitacion({ id_persona, creado_por, tipo = INVITE_TYPES.ADMIN, reenvios = 0, rol_asignado = null, es_administrativo = false }) {
    const persona = await Persona.findByPk(id_persona);
    if (!persona) throw new Error('Persona no encontrada');

    const inviteType = tipo || INVITE_TYPES.ADMIN;
    const esAdminInvite = es_administrativo || inviteType === INVITE_TYPES.ADMIN;

    const token = this.generarToken();
    const token_hash = this.hashToken(token);
    const codigo_6d = this.generarCodigo6d();
    const expira_en = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    // Invalidar invitaciones previas activas del mismo tipo
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
    const emailVerificationBase = process.env.EMAIL_VERIFICATION_URL_BASE || 'http://localhost:3000/verificar-correo';
    const activationLink = `${activationBase}?token=${encodeURIComponent(token)}`;
    const verificationLink = `${emailVerificationBase}?token=${encodeURIComponent(token)}`;

    if (inviteType === INVITE_TYPES.SIGNUP_VERIFY) {
      await emailService.enviarEmailVerificacion({
        email: persona.correo,
        nombre_completo: persona.nombre_completo,
        codigo_6d,
        expira_en,
        verificationLink
      });
    } else {
      await emailService.enviarEmailInvitacion({
        email: persona.correo,
        nombre_completo: persona.nombre_completo,
        token,
        codigo_6d,
        expira_en,
        activationLink,
        rol_asignado: rol_asignado || (esAdminInvite ? 'Administrativo' : null),
        es_administrativo: esAdminInvite
      });
    }

    logger.info(`Invitacion creada para persona ${id_persona} por ${creado_por || 'sistema'}`);
    return { token, codigo_6d, expira_en, tipo: inviteType, reenvios };
  }

  async reenviar(token) {
    const token_hash = this.hashToken(token);
    const invitacion = await Invitacion.findOne({
      where: { token_hash },
      include: [{ model: Persona, as: 'persona', attributes: ['id_persona', 'correo', 'nombre_completo', 'estado'] }]
    });
    if (!invitacion) throw new Error('Invitacion no encontrada');

    const ahora = new Date();
    const expirada = invitacion.expira_en && ahora > invitacion.expira_en;
    const usada = Boolean(invitacion.usado_en);
    const intentosAgotados = invitacion.intentos >= INVITE_MAX_INTENTOS;
    const reenviosActuales = invitacion.reenvios || 0;
    const siguienteReenvio = reenviosActuales + 1;

    if (invitacion.tipo === INVITE_TYPES.SIGNUP_VERIFY) {
      if (siguienteReenvio >= VERIFICATION_MAX_CODES) {
        throw new Error('Has superado el limite de codigos de verificacion. Contacta a soporte para validar tu cuenta.');
      }

      const nuevo = await this.crearInvitacion({
        id_persona: invitacion.id_persona,
        creado_por: invitacion.creado_por || null,
        tipo: invitacion.tipo,
        reenvios: siguienteReenvio
      });

      return {
        ...nuevo,
        total_enviados: siguienteReenvio + 1,
        max_codigos: VERIFICATION_MAX_CODES
      };
    }

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

    const nuevo = await this.crearInvitacion({
      id_persona: invitacion.id_persona,
      creado_por: invitacion.creado_por || null,
      tipo: invitacion.tipo,
      reenvios: siguienteReenvio
    });

    return nuevo;
  }

  async reenviarSignupPorEmail(email, { ignoreLimit = false } = {}) {
    const persona = await Persona.findOne({ where: { correo: email } });
    if (!persona) throw new Error('No encontramos una cuenta con ese correo');
    if (persona.correo_verificado) throw new Error('Esta cuenta ya fue verificada');

    const ultimaInvitacion = await Invitacion.findOne({
      where: { id_persona: persona.id_persona, tipo: INVITE_TYPES.SIGNUP_VERIFY },
      order: [['creado_en', 'DESC']]
    });

    const reenviosActuales = ultimaInvitacion?.reenvios || 0;
    const siguienteReenvio = reenviosActuales + 1;

    if (!ignoreLimit && siguienteReenvio >= VERIFICATION_MAX_CODES) {
      const limitError = new Error('Has superado el limite de codigos disponibles. Contacta a soporte para validar tu cuenta.');
      limitError.code = 'VERIFICATION_LIMIT';
      throw limitError;
    }

    const nuevo = await this.crearInvitacion({
      id_persona: persona.id_persona,
      creado_por: null,
      tipo: INVITE_TYPES.SIGNUP_VERIFY,
      reenvios: siguienteReenvio
    });

    return {
      ...nuevo,
      email: persona.correo,
      total_enviados: siguienteReenvio + 1,
      max_codigos: VERIFICATION_MAX_CODES
    };
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
    if (invitacion.tipo === INVITE_TYPES.ADMIN && invitacion.intentos >= INVITE_MAX_INTENTOS) {
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

  async verificarCorreo(token, meta = {}) {
    const token_hash = this.hashToken(token);
    const invitacion = await Invitacion.findOne({
      where: { token_hash, tipo: INVITE_TYPES.SIGNUP_VERIFY },
      include: [{ model: Persona, as: 'persona', attributes: ['id_persona', 'correo', 'nombre_completo', 'estado'] }]
    });

    if (!invitacion) throw new Error('Invitacion no encontrada o token invalido');
    if (invitacion.usado_en) throw new Error('El enlace ya fue utilizado');

    const ahora = new Date();
    const expirada = invitacion.expira_en && ahora > invitacion.expira_en;
    if (expirada) {
      await Persona.update(
        { estado: false },
        { where: { id_persona: invitacion.id_persona } }
      );
      throw new Error('El enlace expiro. Solicita un nuevo envio.');
    }

    await Persona.update(
      { correo_verificado: true, estado: true },
      { where: { id_persona: invitacion.id_persona } }
    );

    await Invitacion.update(
      {
        usado_en: new Date(),
        ip_uso: meta.ip || null,
        ua_uso: meta.userAgent || null
      },
      { where: { id_invitacion: invitacion.id_invitacion } }
    );

    return { id_persona: invitacion.id_persona, correo: invitacion.persona?.correo };
  }

  async verificarCodigoSignup({ email, codigo_6d, meta = {} }) {
    const persona = await Persona.findOne({ where: { correo: email } });
    if (!persona) throw new Error('No encontramos una cuenta con ese correo');
    if (persona.correo_verificado) return { id_persona: persona.id_persona, correo: persona.correo, ya_verificado: true };

    const invitacion = await Invitacion.findOne({
      where: { id_persona: persona.id_persona, tipo: INVITE_TYPES.SIGNUP_VERIFY },
      order: [['creado_en', 'DESC']]
    });

    if (!invitacion) {
      throw new Error('No encontramos un codigo activo. Solicita un nuevo envio.');
    }

    if (invitacion.usado_en) {
      throw new Error('Este codigo ya fue utilizado. Solicita un nuevo envio.');
    }

    if (new Date() > invitacion.expira_en) {
      throw new Error('El codigo expiro. Solicita un nuevo envio.');
    }

    if (invitacion.intentos >= INVITE_MAX_INTENTOS) {
      throw new Error('Has superado los intentos permitidos. Solicita un nuevo codigo.');
    }

    if (invitacion.codigo_6d !== codigo_6d) {
      await Invitacion.update(
        { intentos: invitacion.intentos + 1 },
        { where: { id_invitacion: invitacion.id_invitacion } }
      );
      throw new Error('Codigo incorrecto. Revisa el correo y vuelve a intentarlo.');
    }

    await Persona.update(
      { correo_verificado: true, estado: true },
      { where: { id_persona: persona.id_persona } }
    );

    await Invitacion.update(
      {
        usado_en: new Date(),
        ip_uso: meta.ip || null,
        ua_uso: meta.userAgent || null
      },
      { where: { id_invitacion: invitacion.id_invitacion } }
    );

    return { id_persona: persona.id_persona, correo: persona.correo };
  }

  async getSignupVerificationStatus(id_persona) {
    const invitacion = await Invitacion.findOne({
      where: { id_persona, tipo: INVITE_TYPES.SIGNUP_VERIFY },
      order: [['creado_en', 'DESC']]
    });

    const reenviosActuales = invitacion?.reenvios || 0;
    const total_enviados = invitacion ? reenviosActuales + 1 : 0;
    const restantes = Math.max(VERIFICATION_MAX_CODES - total_enviados, 0);

    return {
      expira_en: invitacion?.expira_en || null,
      total_enviados,
      max_codigos: VERIFICATION_MAX_CODES,
      puede_reenviar: restantes > 0,
      reenvios_actuales: reenviosActuales
    };
  }

  getVerificationLimits() {
    return {
      max_codigos: VERIFICATION_MAX_CODES,
      ttl_horas: INVITE_TTL_HOURS
    };
  }

  async aceptar({ token, codigo_6d, password, ip, userAgent }) {
    const token_hash = this.hashToken(token);
    const invitacion = await Invitacion.findOne({ where: { token_hash } });
    if (!invitacion) throw new Error('Invitacion no encontrada o token invalido');
    if (invitacion.usado_en) throw new Error('Invitacion ya utilizada');
    if (new Date() > invitacion.expira_en) throw new Error('Invitacion expirada');

    // Activacion de acceso (admin_invite)
    if (invitacion.tipo === INVITE_TYPES.ADMIN) {
      if (invitacion.intentos >= INVITE_MAX_INTENTOS) throw new Error('Invitacion bloqueada por intentos fallidos');

      if (invitacion.codigo_6d !== codigo_6d) {
        await Invitacion.update(
          { intentos: invitacion.intentos + 1 },
          { where: { id_invitacion: invitacion.id_invitacion } }
        );
        throw new Error('Codigo de verificacion incorrecto');
      }

      const hashedPassword = await bcryptUtils.hashPassword(password);

      const existing = await Acceso.findOne({ where: { id_persona: invitacion.id_persona } });
      if (existing) {
        await existing.update({
          contrasena: hashedPassword,
          ultimo_cambio_password: new Date(),
          password_change_required: false
        });
      } else {
        await Acceso.create({
          id_persona: invitacion.id_persona,
          contrasena: hashedPassword,
          ultimo_cambio_password: new Date(),
          password_change_required: false
        });
      }

      await Persona.update(
        { tiene_cuenta: true, correo_verificado: true },
        { where: { id_persona: invitacion.id_persona } }
      );

      // Asegurar rol Usuario asignado
      const rolUsuario = await Rol.findOne({ where: { nombre_rol: 'Usuario' } });
      if (rolUsuario) {
        const yaTieneRol = await PersonasRol.findOne({
          where: { id_persona: invitacion.id_persona, id_rol: rolUsuario.id_rol }
        });
        if (!yaTieneRol) {
          await PersonasRol.create({
            id_persona: invitacion.id_persona,
            id_rol: rolUsuario.id_rol
          });
        }
      }
    } else if (invitacion.tipo === INVITE_TYPES.SIGNUP_VERIFY) {
      return this.verificarCorreo(token, { ip, userAgent });
    }

    await Invitacion.update(
      {
        usado_en: new Date(),
        intentos: invitacion.intentos,
        ip_uso: ip || null,
        ua_uso: userAgent || null
      },
      { where: { id_invitacion: invitacion.id_invitacion } }
    );

    return { id_persona: invitacion.id_persona };
  }
}

module.exports = new InvitacionService();
