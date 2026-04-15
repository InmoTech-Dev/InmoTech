const { Op } = require('sequelize');
const { Lease, Inmueble, SeguimientoArrendamiento, Notificacion, sequelize } = require('../models');
const logger = require('../utils/logger');
const notificacionService = require('../services/notificacion.service');

const AUTO_FINALIZE_COMMENT =
  'Arrendamiento finalizado automaticamente por vencimiento de fecha de contrato.';
const LEASE_ENDING_SOON_TYPE = 'ARRENDAMIENTO_PROXIMO_A_FINALIZAR';
const LEASE_ENDING_SOON_ROLES = ['Super Administrador', 'Administrador', 'Gerente', 'Supervisor'];

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function createUpcomingLeaseEndNotifications(now = new Date()) {
  const today = new Date(`${formatDateOnly(now)}T00:00:00.000Z`);
  const targetDate = formatDateOnly(addDays(today, 30));
  const roleIds = await notificacionService.obtenerRolesActivos(LEASE_ENDING_SOON_ROLES);

  if (!roleIds.length) {
    return 0;
  }

  const leasesEndingSoon = await Lease.findAll({
    where: {
      estado: { [Op.notIn]: ['Finalizado', 'Cancelado'] },
      fecha_finalizacion: targetDate
    },
    include: [
      {
        association: 'arrendatario',
        attributes: ['id_arrendatario'],
        required: false,
        include: [
          {
            association: 'persona',
            attributes: ['nombre_completo', 'apellido_completo'],
            required: false
          }
        ]
      },
      {
        association: 'inmueble',
        attributes: ['registro_inmobiliario', 'direccion'],
        required: false
      }
    ]
  });

  let created = 0;

  for (const lease of leasesEndingSoon) {
    const tenantName = [
      lease?.arrendatario?.persona?.nombre_completo,
      lease?.arrendatario?.persona?.apellido_completo
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Arrendatario';
    const propertyLabel =
      lease?.inmueble?.registro_inmobiliario ||
      lease?.inmueble?.direccion ||
      `Arriendo #${lease.id_arrendamiento}`;
    const title = `Arriendo #${lease.id_arrendamiento} próximo a finalizar`;
    const message =
      `Al arriendo #${lease.id_arrendamiento} le falta un mes para finalizar ` +
      `(fecha: ${targetDate}). Arrendatario: ${tenantName}. Inmueble: ${propertyLabel}.`;

    for (const roleId of roleIds) {
      const existing = await Notificacion.findOne({
        where: {
          tipo_notificacion: LEASE_ENDING_SOON_TYPE,
          titulo: title,
          mensaje: message,
          id_rol_destino: roleId
        }
      });

      if (existing) {
        continue;
      }

      await notificacionService.crearNotificacion({
        tipo: LEASE_ENDING_SOON_TYPE,
        titulo: title,
        mensaje: message,
        id_cita: null,
        id_rol_destino: roleId
      });
      created += 1;
    }
  }

  return created;
}

async function runDailyLeaseAutoFinalize(now = new Date()) {
  const today = now.toISOString().slice(0, 10);

  const leasesToFinalize = await Lease.findAll({
    where: {
      estado: { [Op.notIn]: ['Finalizado', 'Cancelado'] },
      fecha_finalizacion: { [Op.lt]: today }
    },
    attributes: ['id_arrendamiento', 'id_inmueble', 'estado', 'fecha_finalizacion']
  });

  const notificationsCreated = await createUpcomingLeaseEndNotifications(now);

  if (!leasesToFinalize.length) {
    return { finalized: 0, propertiesReleased: 0, notificationsCreated };
  }

  const leaseIds = leasesToFinalize.map((lease) => lease.id_arrendamiento);
  const propertyIds = [...new Set(leasesToFinalize.map((lease) => lease.id_inmueble).filter(Boolean))];

  await sequelize.transaction(async (transaction) => {
    await Lease.update(
      { estado: 'Finalizado' },
      {
        where: { id_arrendamiento: leaseIds },
        transaction
      }
    );

    if (propertyIds.length) {
      await Inmueble.update(
        {
          estado: true,
          estado_frontend: 'Disponible'
        },
        {
          where: { id_inmueble: propertyIds },
          transaction
        }
      );
    }

    await SeguimientoArrendamiento.bulkCreate(
      leaseIds.map((id) => ({
        id_arrendamiento: id,
        estado: 'Finalizado',
        comentario: AUTO_FINALIZE_COMMENT
      })),
      { transaction }
    );
  });

  logger.info(
    `Arrendamientos auto-finalizados: ${leaseIds.length}; inmuebles liberados: ${propertyIds.length}`
  );

  return {
    finalized: leaseIds.length,
    propertiesReleased: propertyIds.length,
    notificationsCreated
  };
}

function scheduleDailyLeaseAutoFinalize() {
  runDailyLeaseAutoFinalize().catch((error) => {
    logger.error(`Error en auto-finalizacion diaria de arrendamientos: ${error.message}`);
  });

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const interval = setInterval(() => {
    runDailyLeaseAutoFinalize().catch((error) => {
      logger.error(`Error en auto-finalizacion diaria de arrendamientos: ${error.message}`);
    });
  }, ONE_DAY);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
}

module.exports = { runDailyLeaseAutoFinalize, scheduleDailyLeaseAutoFinalize };
