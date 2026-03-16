const { Op } = require('sequelize');
const { Renant, Persona, Arriendo, Inmueble, Lease, Rol, PersonasRol } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const invitacionService = require('./invitacion.service');

const PERSONA_ATTRS = [
  'id_persona',
  'nombre_completo',
  'apellido_completo',
  'tipo_documento',
  'numero_documento',
  'correo',
  'telefono',
  'fecha_registro',
  'estado'
];

const RENANT_ATTRS = [
  'id_arrendatario',
  'id_persona',
  'registro_arrendatario',
  'fecha_registro_arrendatario',
  'tipo_arrendatario',
  'ciudad_residencia',
  'direccion_anterior',
  'contacto_emergencia_nombre',
  'contacto_emergencia_telefono',
  'contacto_emergencia_parentesco',
  'estado',
  'observaciones',
  'fecha_creacion',
  'fecha_actualizacion'
];

class RenantService {
  async generateRenantCode(transaction) {
    const total = await Renant.count({ transaction });
    return `ARREN-${String(total + 1).padStart(4, '0')}`;
  }

  personaQuery(where = {}) {
    return {
      where,
      attributes: PERSONA_ATTRS,
      include: [
        {
          association: 'renant',
          attributes: RENANT_ATTRS,
          required: false
        }
      ]
    };
  }

  normalizeRenant(renantInstance) {
    if (!renantInstance) return null;
    const persona = renantInstance.persona || renantInstance;
    const renant = renantInstance.renant || renantInstance;

    return {
      id_arrendatario: renant?.id_arrendatario || null,
      id_persona: persona.id_persona,
      registro_arrendatario: renant?.registro_arrendatario || null,
      fecha_registro_arrendatario: renant?.fecha_registro_arrendatario || persona.fecha_registro,
      tipo_arrendatario: renant?.tipo_arrendatario || null,
      ciudad_residencia: renant?.ciudad_residencia || null,
      direccion_anterior: renant?.direccion_anterior || null,
      estado: renant?.estado || (persona.estado ? 'Activo' : 'Inactivo'),
      contacto_emergencia: renant
        ? {
            nombre: renant.contacto_emergencia_nombre,
            telefono: renant.contacto_emergencia_telefono,
            parentesco: renant.contacto_emergencia_parentesco
          }
        : null,
      observaciones: renant?.observaciones || null,
      persona: {
        id_persona: persona.id_persona,
        nombre_completo: persona.nombre_completo,
        apellido_completo: persona.apellido_completo,
        tipo_documento: persona.tipo_documento,
        numero_documento: persona.numero_documento,
        correo: persona.correo,
        telefono: persona.telefono
      }
    };
  }

  async upsertPersona(personaData, transaction) {
    const [persona, created] = await Persona.findOrCreate({
      where: {
        tipo_documento: personaData.tipo_documento,
        numero_documento: personaData.numero_documento
      },
      defaults: {
        tipo_documento: personaData.tipo_documento,
        numero_documento: personaData.numero_documento,
        nombre_completo: personaData.nombre_completo,
        apellido_completo: personaData.apellido_completo,
        correo: personaData.correo,
        telefono: personaData.telefono,
        tiene_cuenta: false,
        estado: true
      },
      transaction
    });

    if (!created) {
      await persona.update(
        {
          nombre_completo: personaData.nombre_completo ?? persona.nombre_completo,
          apellido_completo: personaData.apellido_completo ?? persona.apellido_completo,
          correo: personaData.correo ?? persona.correo,
          telefono: personaData.telefono ?? persona.telefono
        },
        { transaction }
      );
    }

    return { persona, created };
  }

  async ensureTenantRoleAssigned(personaId, transaction) {
    let tenantRole = await Rol.findOne({
      where: { nombre_rol: 'Arrendatario' },
      transaction
    });

    if (!tenantRole) {
      tenantRole = await Rol.create(
        {
          nombre_rol: 'Arrendatario',
          descripcion: 'Usuario arrendatario con acceso a su portal de facturas',
          es_rol_administrativo: false,
          estado: true
        },
        { transaction }
      );
    }

    const existingLink = await PersonasRol.findOne({
      where: { id_persona: personaId, id_rol: tenantRole.id_rol },
      transaction
    });

    if (existingLink) {
      if (existingLink.estado === false) {
        await existingLink.update({ estado: true }, { transaction });
      }
      return;
    }

    await PersonasRol.create(
      {
        id_persona: personaId,
        id_rol: tenantRole.id_rol,
        estado: true
      },
      { transaction }
    );
  }

  buildRenantPayload(data, existing) {
    return {
      registro_arrendatario:
        data.registro_arrendatario || existing?.registro_arrendatario || undefined,
      fecha_registro_arrendatario:
        data.fecha_registro_arrendatario || existing?.fecha_registro_arrendatario || undefined,
      tipo_arrendatario: data.tipo_arrendatario || existing?.tipo_arrendatario || 'Potencial',
      ciudad_residencia: data.ciudad_residencia ?? existing?.ciudad_residencia ?? null,
      direccion_anterior: data.direccion_anterior ?? existing?.direccion_anterior ?? null,
      contacto_emergencia_nombre:
        data.contacto_emergencia_nombre ?? existing?.contacto_emergencia_nombre ?? null,
      contacto_emergencia_telefono:
        data.contacto_emergencia_telefono ?? existing?.contacto_emergencia_telefono ?? null,
      contacto_emergencia_parentesco:
        data.contacto_emergencia_parentesco ?? existing?.contacto_emergencia_parentesco ?? null,
      observaciones: data.observaciones ?? existing?.observaciones ?? null,
      estado: data.estado || existing?.estado || 'Activo'
    };
  }

  async createRenant(renantData) {
    const transaction = await sequelize.transaction();
    try {
      const { persona, created } = await this.upsertPersona(renantData, transaction);

      await this.ensureTenantRoleAssigned(persona.id_persona, transaction);

      const existing = await Renant.findOne({
        where: { id_persona: persona.id_persona },
        transaction
      });

      const payload = this.buildRenantPayload(renantData, existing);
      if (!payload.registro_arrendatario) {
        payload.registro_arrendatario = await this.generateRenantCode(transaction);
      }
      payload.id_persona = persona.id_persona;

      let renant;
      if (existing) {
        await existing.update(payload, { transaction });
        renant = existing;
      } else {
        renant = await Renant.create(payload, { transaction });
      }

      // Crear contrato de arrendamiento si llega la información necesaria
      const hasLeaseData =
        renantData.id_inmueble &&
        renantData.fecha_inicio_arrendamiento &&
        renantData.fecha_fin_arrendamiento &&
        renantData.valor_arriendo_mensual;

      if (hasLeaseData) {
        // Validar que el inmueble exista antes de asociarlo
        const inmueble = await Inmueble.findByPk(renantData.id_inmueble, { transaction });
        if (!inmueble) {
          throw new Error('Inmueble no encontrado para crear el arrendamiento');
        }

        await Arriendo.create(
          {
            id_arrendatario: renant.id_arrendatario,
            id_inmueble: renantData.id_inmueble,
            fecha_inicio: renantData.fecha_inicio_arrendamiento,
            fecha_finalizacion: renantData.fecha_fin_arrendamiento,
            valor_mensual: renantData.valor_arriendo_mensual,
            tipo_garantia: renantData.tipo_garantia || null,
            valor_garantia: renantData.valor_garantia || null,
            descripcion_garantia: renantData.descripcion_garantia || null,
            estado: renantData.estado || 'Activo'
          },
          { transaction }
        );

        // Marcar el inmueble como arrendado
        await inmueble.update(
          {
            estado: false,
            estado_frontend: 'Arrendado',
            destacado: false
          },
          { transaction }
        );
      }

      const shouldSendActivationInvite =
        (created || persona.tiene_cuenta === false) &&
        typeof persona.correo === 'string' &&
        persona.correo.trim().length > 0;

      if (shouldSendActivationInvite) {
        try {
          await invitacionService.crearInvitacion({
            id_persona: persona.id_persona,
            creado_por: null,
            tipo: 'user_invite',
            rol_asignado: 'Arrendatario',
            es_administrativo: false
          });
        } catch (inviteError) {
          logger.warn('No se pudo enviar invitacion de activacion al arrendatario', {
            id_persona: persona.id_persona,
            error: inviteError.message
          });
        }
      }

      await transaction.commit();
      const refreshed = await this.getRenantById(renant.id_arrendatario);
      return refreshed;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creando arrendatario', { error: error.message });
      throw error;
    }
  }

  async getRenantById(id) {
    const renant = await Renant.findOne({
      where: { id_arrendatario: id },
      attributes: RENANT_ATTRS,
      include: [{ association: 'persona', attributes: PERSONA_ATTRS }]
    });
    return this.normalizeRenant(renant);
  }

  async getAllRenants(filters = {}) {
    const renantWhere = {};
    if (filters.status) renantWhere.estado = filters.status;
    if (filters.tipo_arrendatario) renantWhere.tipo_arrendatario = filters.tipo_arrendatario;

    const renants = await Renant.findAll({
      where: Object.keys(renantWhere).length ? renantWhere : undefined,
      attributes: RENANT_ATTRS,
      include: [{ association: 'persona', attributes: PERSONA_ATTRS }]
    });

    return renants.map((r) => this.normalizeRenant(r));
  }

  async updateRenant(id, updateData) {
    const transaction = await sequelize.transaction();
    try {
      const renant = await Renant.findByPk(id, {
        include: [{ association: 'persona' }],
        transaction
      });
      if (!renant) throw new Error('Arrendatario no encontrado');

      const [legacyArriendos, leaseRows] = await Promise.all([
        Arriendo.count({ where: { id_arrendatario: id }, transaction }),
        Lease ? Lease.count({ where: { id_cliente: id }, transaction }) : Promise.resolve(0)
      ]);
      if (legacyArriendos + leaseRows > 0) {
        const err = new Error(
          'No puedes editar un arrendatario con arriendos asociados. Finaliza o elimina el contrato primero.'
        );
        err.status = 409;
        throw err;
      }

      if (renant.persona) {
        await renant.persona.update(
          {
            nombre_completo: updateData.nombre_completo ?? renant.persona.nombre_completo,
            apellido_completo: updateData.apellido_completo ?? renant.persona.apellido_completo,
            correo: updateData.correo ?? renant.persona.correo,
            telefono: updateData.telefono ?? renant.persona.telefono
          },
          { transaction }
        );
      }

      const payload = this.buildRenantPayload(updateData, renant);
      await renant.update(payload, { transaction });

      await transaction.commit();
      return this.getRenantById(id);
    } catch (error) {
      await transaction.rollback();
      logger.error('Error actualizando arrendatario', { error: error.message });
      throw error;
    }
  }

  async deactivateRenant(id) {
    const renant = await Renant.findByPk(id);
    if (!renant) throw new Error('Arrendatario no encontrado');
    await renant.update({ estado: 'Inactivo' });
    return this.getRenantById(id);
  }

  async deleteRenant(id) {
    const transaction = await sequelize.transaction();
    try {
      const renant = await Renant.findByPk(id, { transaction });
      if (!renant) throw new Error('Arrendatario no encontrado');
      const personaId = renant.id_persona;
      await renant.destroy({ transaction });
      await transaction.commit();
      return { id_arrendatario: id, id_persona: personaId };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error eliminando arrendatario', { error: error.message });
      throw error;
    }
  }

  async searchRenants(criteria = {}) {
    const personaWhere = {};
    const renantWhere = {};

    if (criteria.tipo_documento) personaWhere.tipo_documento = criteria.tipo_documento;
    if (criteria.numero_documento) personaWhere.numero_documento = criteria.numero_documento;
    if (criteria.nombre) {
      personaWhere[Op.or] = [
        { nombre_completo: { [Op.like]: `%${criteria.nombre}%` } },
        { apellido_completo: { [Op.like]: `%${criteria.nombre}%` } }
      ];
    }
    if (criteria.status) renantWhere.estado = criteria.status;
    if (criteria.tipo_arrendatario) renantWhere.tipo_arrendatario = criteria.tipo_arrendatario;

    const renants = await Renant.findAll({
      where: Object.keys(renantWhere).length ? renantWhere : undefined,
      attributes: RENANT_ATTRS,
      include: [
        {
          association: 'persona',
          attributes: PERSONA_ATTRS,
          where: Object.keys(personaWhere).length ? personaWhere : undefined
        }
      ]
    });

    return renants.map((r) => this.normalizeRenant(r));
  }
}

module.exports = new RenantService();
