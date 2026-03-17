const { Op } = require('sequelize');
const { Lease, Inmueble, SeguimientoArrendamiento, sequelize } = require('../models');
const logger = require('../utils/logger');

const AUTO_FINALIZE_COMMENT =
  'Arrendamiento finalizado automaticamente por vencimiento de fecha de contrato.';

async function runDailyLeaseAutoFinalize(now = new Date()) {
  const today = now.toISOString().slice(0, 10);

  const leasesToFinalize = await Lease.findAll({
    where: {
      estado: { [Op.notIn]: ['Finalizado', 'Cancelado'] },
      fecha_finalizacion: { [Op.lt]: today }
    },
    attributes: ['id_arrendamiento', 'id_inmueble', 'estado', 'fecha_finalizacion']
  });

  if (!leasesToFinalize.length) {
    return { finalized: 0, propertiesReleased: 0 };
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
    propertiesReleased: propertyIds.length
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
