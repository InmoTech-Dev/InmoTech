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

const runVentaAdjuntosBackfill = async () => {
  const enabled = toBoolean(process.env.VENTA_ADJUNTOS_BACKFILL_ON_START, true);
  if (!enabled) {
    logger.info('[VENTA_ADJUNTOS_BACKFILL] disabled by VENTA_ADJUNTOS_BACKFILL_ON_START=false');
    return { checked: false, changed: false, skipped: true };
  }

  const [result] = await sequelize.query(`
    SELECT OBJECT_ID('dbo.VentaAdjuntos', 'U') AS table_id
  `);

  const exists = !!result?.[0]?.table_id;
  if (exists) {
    logger.info('[VENTA_ADJUNTOS_BACKFILL] table VentaAdjuntos already exists');
    return { checked: true, changed: false, skipped: false };
  }

  await sequelize.query(`
    CREATE TABLE VentaAdjuntos (
      id_adjunto INT IDENTITY(1,1) PRIMARY KEY,
      id_venta INT NOT NULL,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('comprobante','contrato')),
      nombre_archivo VARCHAR(255) NOT NULL,
      url VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100) NULL,
      tamano_bytes BIGINT NULL,
      fecha_creacion DATETIME2(3) NOT NULL DEFAULT GETDATE(),
      CONSTRAINT FK_VentaAdjuntos_Venta FOREIGN KEY (id_venta) REFERENCES Ventas(id_venta) ON DELETE CASCADE
    );
  `);

  await sequelize.query(`
    CREATE NONCLUSTERED INDEX IX_VentaAdjuntos_Venta ON VentaAdjuntos(id_venta, tipo);
  `);

  logger.info('[VENTA_ADJUNTOS_BACKFILL] table VentaAdjuntos created');
  return { checked: true, changed: true, skipped: false };
};

module.exports = {
  runVentaAdjuntosBackfill
};
