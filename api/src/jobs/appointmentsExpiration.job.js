const citaService = require('../services/cita.service');
const logger = require('../utils/logger');

async function runAppointmentsExpiration(now = new Date()) {
  const result = await citaService.cancelarCitasSolicitadasExpiradas(now);
  return result;
}

function scheduleAppointmentsExpiration() {
  runAppointmentsExpiration().catch((error) =>
    logger.error(`Error ejecutando expiración automática de citas: ${error.message}`)
  );

  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runAppointmentsExpiration().catch((error) =>
      logger.error(`Error ejecutando expiración automática de citas: ${error.message}`)
    );
  }, ONE_DAY);
}

module.exports = { runAppointmentsExpiration, scheduleAppointmentsExpiration };
