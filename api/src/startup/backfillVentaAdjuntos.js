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

const getVentaAdjuntosTableInfo = async () => {
  const [rows] = await sequelize.query(`
    SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'VentaAdjuntos'
  `);

  return Array.isArray(rows) ? rows[0] || null : null;
};

const runVentaAdjuntosBackfill = async () => {
  const enabled = toBoolean(process.env.VENTA_ADJUNTOS_BACKFILL_ON_START, true);
  if (!enabled) {
    logger.info('[VENTA_ADJUNTOS_BACKFILL] disabled by VENTA_ADJUNTOS_BACKFILL_ON_START=false');
    return { exists: false, skipped: true };
  }

  const tableInfo = await getVentaAdjuntosTableInfo();
  if (!tableInfo) {
    logger.warn('[VENTA_ADJUNTOS_BACKFILL] table VentaAdjuntos not found; skipping startup backfill');
    return { exists: false, skipped: true };
  }

  logger.info(
    `[VENTA_ADJUNTOS_BACKFILL] table detected at ${tableInfo.table_schema}.${tableInfo.table_name}`
  );

  return {
    exists: true,
    schema: tableInfo.table_schema,
    table: tableInfo.table_name,
    skipped: false
  };
};

module.exports = {
  runVentaAdjuntosBackfill
};
