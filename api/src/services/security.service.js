const { Persona, Rol, PersonasRol, Administrativo } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const sseService = require('./sse.service');
const realtimeAudienceService = require('./realtimeAudience.service');
const {
  SUPER_ADMIN_ROLE,
  ADMINISTRATOR_ROLE,
  PROTECTED_ROLES,
} = require('../constants/roles.constants');

const buildHttpError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

class SecurityService {
  async transferAdminHolder({
    actorUserId,
    targetPersonaId,
    disablePreviousAccount = true,
    reason,
  }) {
    const payload = await sequelize.transaction(async (t) => {
      const [adminRole, actorPersona, targetPersona, targetAdministrativo] = await Promise.all([
        Rol.findOne({
          where: { nombre_rol: ADMINISTRATOR_ROLE, estado: true },
          transaction: t,
        }),
        Persona.findOne({
          where: { id_persona: actorUserId, estado: true },
          include: [
            {
              model: Rol,
              as: 'roles',
              through: {
                attributes: ['estado'],
                where: { estado: true },
              },
              where: { estado: true, nombre_rol: SUPER_ADMIN_ROLE },
              required: true,
            },
          ],
          transaction: t,
        }),
        Persona.findOne({
          where: { id_persona: targetPersonaId, estado: true },
          transaction: t,
        }),
        Administrativo.findOne({
          where: { id_persona: targetPersonaId, estado_laboral: 'Activo' },
          transaction: t,
        }),
      ]);

      if (!actorPersona) {
        throw buildHttpError('No tienes permisos para transferir el rol Administrador', 403);
      }

      if (!adminRole) {
        throw buildHttpError('No existe un rol Administrador activo en el sistema', 400);
      }

      if (!PROTECTED_ROLES.includes(adminRole.nombre_rol)) {
        throw buildHttpError('Configuracion invalida de rol Administrador', 400);
      }

      if (!targetPersona) {
        throw buildHttpError('La persona objetivo no existe o está inactiva', 400);
      }

      if (!targetAdministrativo) {
        throw buildHttpError('La persona objetivo no tiene un registro administrativo activo', 400);
      }

      const activeAdminAssignments = await PersonasRol.findAll({
        where: {
          id_rol: adminRole.id_rol,
          estado: true,
        },
        attributes: ['id_persona_rol', 'id_persona'],
        transaction: t,
      });

      if (activeAdminAssignments.length > 1) {
        throw buildHttpError(
          'Inconsistencia detectada: existe más de un Administrador activo',
          409
        );
      }

      const currentAdminAssignment = activeAdminAssignments[0] || null;
      const previousHolderPersonaId = currentAdminAssignment?.id_persona || null;

      if (previousHolderPersonaId && previousHolderPersonaId === targetPersonaId) {
        const auditTimestamp = new Date().toISOString();
        logger.info('[SECURITY][ADMIN_HOLDER] no-op', {
          actor_user_id: actorUserId,
          target_persona_id: targetPersonaId,
          previous_holder_persona_id: previousHolderPersonaId,
          reason,
          audit_timestamp: auditTimestamp,
        });

        return {
          action: 'noop',
          role_id: adminRole.id_rol,
          previous_holder_persona_id: previousHolderPersonaId,
          new_holder_persona_id: targetPersonaId,
          previous_account_disabled: false,
          audit_timestamp: auditTimestamp,
        };
      }

      if (currentAdminAssignment) {
        await currentAdminAssignment.update({ estado: false }, { transaction: t });
      }

      const existingTargetAssignment = await PersonasRol.findOne({
        where: {
          id_persona: targetPersonaId,
          id_rol: adminRole.id_rol,
        },
        transaction: t,
      });

      // Desactivar cualquier otro rol que tenga el usuario objetivo
      await PersonasRol.update(
        { estado: false },
        {
          where: {
            id_persona: targetPersonaId,
            id_rol: { [require('sequelize').Op.ne]: adminRole.id_rol }
          },
          transaction: t
        }
      );

      if (existingTargetAssignment) {
        await existingTargetAssignment.update({ estado: true }, { transaction: t });
      } else {
        await PersonasRol.create(
          {
            id_persona: targetPersonaId,
            id_rol: adminRole.id_rol,
            estado: true,
          },
          { transaction: t }
        );
      }

      let previousAccountDisabled = false;
      if (
        disablePreviousAccount &&
        previousHolderPersonaId &&
        previousHolderPersonaId !== targetPersonaId
      ) {
        const [personaUpdateResult, adminUpdateResult] = await Promise.all([
          Persona.update(
            { estado: false },
            { where: { id_persona: previousHolderPersonaId }, transaction: t }
          ),
          Administrativo.update(
            { estado_laboral: 'Inactivo' },
            { where: { id_persona: previousHolderPersonaId }, transaction: t }
          ),
        ]);
        previousAccountDisabled = true;
      }

      const auditTimestamp = new Date().toISOString();
      logger.info('[SECURITY][ADMIN_HOLDER] transferred', {
        actor_user_id: actorUserId,
        target_persona_id: targetPersonaId,
        previous_holder_persona_id: previousHolderPersonaId,
        new_holder_persona_id: targetPersonaId,
        disable_previous_account: disablePreviousAccount,
        previous_account_disabled: previousAccountDisabled,
        reason,
        audit_timestamp: auditTimestamp,
      });

      return {
        action: previousHolderPersonaId ? 'transferred' : 'assigned',
        role_id: adminRole.id_rol,
        previous_holder_persona_id: previousHolderPersonaId,
        new_holder_persona_id: targetPersonaId,
        previous_account_disabled: previousAccountDisabled,
        audit_timestamp: auditTimestamp,
      };
    });

    const adminIds = await realtimeAudienceService.obtenerAdministrativosActivosIds();

    // Notificar cambio para el nuevo administrador
    sseService.emitUserChanged({
      action: 'role_changed',
      userId: payload.new_holder_persona_id,
      affectedUserIds: [payload.new_holder_persona_id],
      audienceUserIds: adminIds,
    });

    if (payload.previous_account_disabled && payload.previous_holder_persona_id) {
      sseService.notifyUserDisabled(payload.previous_holder_persona_id);

      sseService.emitUserChanged({
        action: 'disabled',
        userId: payload.previous_holder_persona_id,
        affectedUserIds: [payload.previous_holder_persona_id],
        audienceUserIds: adminIds,
      });
    }

    return payload;
  }
}

module.exports = new SecurityService();
