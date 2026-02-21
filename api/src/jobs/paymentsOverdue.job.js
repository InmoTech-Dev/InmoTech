const { Op } = require('sequelize');
const { Payment, Lease } = require('../models');
const leaseService = require('../services/leases.service');
const logger = require('../utils/logger');

/**
 * Marca como vencidos los cobros cuya fecha de cobro ya pasó
 * y pone el arrendamiento en mora (estado Pendiente/Debe).
 */
async function runDailyOverdues(now = new Date()) {
  const today = now.toISOString().slice(0, 10);

  const overdue = await Payment.findAll({
    where: { estado: 'Pendiente', fecha_cobro: { [Op.lte]: today } },
    attributes: ['id_cobro', 'id_arrendamiento']
  });

  if (!overdue.length) return { updated: 0, leases: 0 };

  const idsCobro = overdue.map((p) => p.id_cobro);
  await Payment.update({ estado: 'Vencido' }, { where: { id_cobro: idsCobro } });

  const leaseIds = [...new Set(overdue.map((p) => p.id_arrendamiento))];

  await Lease.update(
    { estado: 'Debe' },
    {
      where: {
        id_arrendamiento: leaseIds,
        estado: { [Op.notIn]: ['Finalizado', 'Cancelado'] }
      }
    }
  );

  for (const id of leaseIds) {
    await leaseService.logSeguimiento({
      id_arrendamiento: id,
      estado: 'Debe',
      comentario: 'Cobro vencido: arrendamiento en mora'
    });
  }

  logger.info(
    `💳 Mora diaria: ${idsCobro.length} cobros vencidos, ${leaseIds.length} arrendamientos marcados`
  );
  return { updated: idsCobro.length, leases: leaseIds.length };
}

function scheduleDailyOverdues() {
  // Ejecuta al iniciar y luego cada 24h
  runDailyOverdues().catch((e) => logger.error(`❌ Mora diaria falló: ${e.message}`));
  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(
    () => runDailyOverdues().catch((e) => logger.error(`❌ Mora diaria falló: ${e.message}`)),
    ONE_DAY
  );
}

module.exports = { runDailyOverdues, scheduleDailyOverdues };
