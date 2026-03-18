const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Override del formato de fecha para SQL Server
Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
  date = this._applyTimezone(date, options);
  return date.format('YYYY-MM-DD HH:mm:ss.SSS');
};

const toInt = (rawValue, fallbackValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallbackValue;
  }
  const parsed = parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const REQUEST_TIMEOUT = toInt(process.env.DB_REQUEST_TIMEOUT, 60000);
const CONNECT_TIMEOUT = toInt(process.env.DB_CONNECT_TIMEOUT, 60000);
const POOL_MAX = toInt(process.env.DB_POOL_MAX, 20);
const POOL_MIN = toInt(process.env.DB_POOL_MIN, 2);
const POOL_ACQUIRE = toInt(process.env.DB_POOL_ACQUIRE, 20000);
const POOL_IDLE = toInt(process.env.DB_POOL_IDLE, 10000);

const rawServer = (process.env.DB_SERVER || 'localhost').trim();
const serverParts = rawServer.split('\\');
const hostFromServer = serverParts[0] || 'localhost';
const instanceFromServer = serverParts[1] || '';

const configuredInstance = (process.env.DB_INSTANCE || '').trim();
const resolvedInstance = configuredInstance || instanceFromServer;
const hasInstanceConfigured = Boolean(resolvedInstance);
// MSSQL no permite instancia + puerto simultaneamente.
// Priorizamos instancia cuando existe para evitar errores con SQLEXPRESS.
const configuredPort = hasInstanceConfigured ? undefined : toInt(process.env.DB_PORT, undefined);
const instanceName = hasInstanceConfigured ? resolvedInstance : '';

if (hasInstanceConfigured && process.env.DB_PORT) {
  logger.warn(
    '[DB] DB_INSTANCE/instancia detectada. Se ignora DB_PORT para evitar conflicto de MSSQL.'
  );
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: hostFromServer,
  dialect: 'mssql',
  dialectOptions: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    options: {
      enableArithAbort: true,
      useUTC: false,
      requestTimeout: REQUEST_TIMEOUT,
      connectTimeout: CONNECT_TIMEOUT,
      ...(instanceName ? { instanceName } : {}),
      ...(configuredPort ? { port: configuredPort } : {})
    }
  },
  pool: {
    max: POOL_MAX,
    min: POOL_MIN,
    acquire: POOL_ACQUIRE,
    idle: POOL_IDLE
  },
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(msg);
    }
  },
  define: {
    timestamps: false,
    freezeTableName: true
  },
  timezone: '-05:00'
});

const testConnection = async () => {
  try {
    logger.info('Intentando conectar a SQL Server...');
    logger.info(`  Host: ${hostFromServer}`);
    logger.info(`  Instancia: ${instanceName || '(por defecto)'}`);
    logger.info(`  Puerto: ${configuredPort || '(dinamico/instancia)'}`);
    logger.info(`  Base de datos: ${process.env.DB_NAME}`);
    logger.info(`  Timeouts (ms): connect=${CONNECT_TIMEOUT}, request=${REQUEST_TIMEOUT}`);
    logger.info(
      `  Pool: max=${POOL_MAX}, min=${POOL_MIN}, acquire=${POOL_ACQUIRE}, idle=${POOL_IDLE}`
    );

    await sequelize.authenticate();
    logger.info('Conexion exitosa a SQL Server');

    const [results] = await sequelize.query(`
      SELECT
        DB_NAME() AS [database_name],
        @@SERVERNAME AS server_name,
        @@SERVICENAME AS service_name
    `);

    logger.info(`Base de datos: ${results[0]?.database_name}`);
    logger.info(`Servidor: ${results[0]?.server_name}`);
    logger.info(`Servicio SQL: ${results[0]?.service_name}`);

    return true;
  } catch (error) {
    logger.error('Error al conectar con SQL Server:');
    logger.error(`  - Host: ${hostFromServer}`);
    logger.error(`  - Instancia: ${instanceName || '(por defecto)'}`);
    logger.error(`  - Puerto: ${configuredPort || '(dinamico/instancia)'}`);
    logger.error(`  - Base de datos: ${process.env.DB_NAME}`);
    logger.error(`  - Usuario: ${process.env.DB_USER}`);
    logger.error(`  - Error: ${error.message}`);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};
