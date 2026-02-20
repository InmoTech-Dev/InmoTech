const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

const toBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
};

const runInmueblesDestacadoBackfill = async () => {
  const enabled = toBoolean(process.env.INMUEBLES_DESTACADO_BACKFILL_ON_START, true);
  if (!enabled) {
    logger.info('[INMUEBLES_DESTACADO_BACKFILL] disabled by INMUEBLES_DESTACADO_BACKFILL_ON_START=false');
    return { checked: false, changed: false, skipped: true };
  }

  const [result] = await sequelize.query(`
    SELECT COL_LENGTH('dbo.Inmuebles', 'destacado') AS destacado_exists
  `);

  const exists = !!result?.[0]?.destacado_exists;
  if (exists) {
    logger.info('[INMUEBLES_DESTACADO_BACKFILL] column Inmuebles.destacado already exists');
    return { checked: true, changed: false, skipped: false };
  }

  await sequelize.query(`
    ALTER TABLE Inmuebles
    ADD destacado BIT NOT NULL
      CONSTRAINT DF_Inmuebles_destacado DEFAULT 0;
  `);

  logger.info('[INMUEBLES_DESTACADO_BACKFILL] column Inmuebles.destacado created');
  return { checked: true, changed: true, skipped: false };
};

module.exports = {
  runInmueblesDestacadoBackfill
};
