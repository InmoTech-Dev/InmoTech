const { Sequelize } = require('sequelize');

const toInt = (rawValue, fallbackValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallbackValue;
  }

  const parsed = parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const normalizeString = (value, fallbackValue = '') => {
  const normalized = String(value ?? fallbackValue).trim();
  return normalized || String(fallbackValue ?? '').trim();
};

const readDbConfigFromEnv = (prefix = 'DB_') => {
  const server = normalizeString(process.env[`${prefix}SERVER`], 'localhost');
  const serverParts = server.split('\\');
  const hostFromServer = serverParts[0] || 'localhost';
  const instanceFromServer = serverParts[1] || '';
  const configuredInstance = normalizeString(process.env[`${prefix}INSTANCE`], '');
  const resolvedInstance = configuredInstance || instanceFromServer;
  const configuredPort = toInt(process.env[`${prefix}PORT`], undefined);

  return {
    source: prefix === 'DB_' ? 'primary' : prefix.toLowerCase().replace(/_$/, ''),
    prefix,
    server,
    host: hostFromServer,
    instanceName: resolvedInstance,
    port: configuredPort,
    database: normalizeString(process.env[`${prefix}NAME`], ''),
    username: normalizeString(process.env[`${prefix}USER`], ''),
    password: String(process.env[`${prefix}PASSWORD`] ?? ''),
    encrypt: String(process.env[`${prefix}ENCRYPT`] ?? process.env.DB_ENCRYPT ?? 'true').trim() === 'true',
    trustServerCertificate:
      String(
        process.env[`${prefix}TRUST_SERVER_CERTIFICATE`] ??
          process.env.DB_TRUST_SERVER_CERTIFICATE ??
          'false'
      ).trim() === 'true',
    requestTimeout: toInt(
      process.env[`${prefix}REQUEST_TIMEOUT`] ?? process.env.DB_REQUEST_TIMEOUT,
      8000
    ),
    connectTimeout: toInt(
      process.env[`${prefix}CONNECT_TIMEOUT`] ?? process.env.DB_CONNECT_TIMEOUT,
      8000
    ),
    poolMax: toInt(process.env[`${prefix}POOL_MAX`] ?? process.env.DB_POOL_MAX, 20),
    poolMin: toInt(process.env[`${prefix}POOL_MIN`] ?? process.env.DB_POOL_MIN, 2),
    poolAcquire: toInt(process.env[`${prefix}POOL_ACQUIRE`] ?? process.env.DB_POOL_ACQUIRE, 20000),
    poolIdle: toInt(process.env[`${prefix}POOL_IDLE`] ?? process.env.DB_POOL_IDLE, 10000),
  };
};

const isConfigUsable = (config) =>
  Boolean(config && config.database && config.username && config.host);

const buildVariant = (config, transport) => ({
  ...config,
  source: `${config.source}-${transport}`,
  transport,
  instanceName: transport === 'instance' ? config.instanceName : '',
  port: transport === 'port' ? config.port : undefined,
});

const expandConfigVariants = (config) => {
  const hasInstance = Boolean(config.instanceName);
  const hasPort = Number.isInteger(config.port) && config.port > 0;

  if (!hasInstance && !hasPort) {
    return [{ ...config, source: `${config.source}-host`, transport: 'host' }];
  }

  if (hasInstance && hasPort) {
    const isLocalHost = ['localhost', '127.0.0.1', '.', '(local)'].includes(
      String(config.host || '').toLowerCase()
    );

    return isLocalHost
      ? [buildVariant(config, 'port'), buildVariant(config, 'instance')]
      : [buildVariant(config, 'instance'), buildVariant(config, 'port')];
  }

  if (hasPort) {
    return [buildVariant(config, 'port')];
  }

  return [buildVariant(config, 'instance')];
};

const buildCandidatesFromEnv = () => {
  const candidates = [];
  const primary = readDbConfigFromEnv('DB_');
  if (isConfigUsable(primary)) {
    candidates.push(...expandConfigVariants(primary));
  }

  const fallback = readDbConfigFromEnv('DB_FALLBACK_');
  if (isConfigUsable(fallback)) {
    candidates.push(...expandConfigVariants(fallback));
  }

  return candidates;
};

const createSequelizeForConfig = (config) =>
  new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: 'mssql',
    dialectOptions: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      options: {
        enableArithAbort: true,
        useUTC: false,
        requestTimeout: config.requestTimeout,
        connectTimeout: config.connectTimeout,
        ...(config.instanceName ? { instanceName: config.instanceName } : {}),
        ...(config.port ? { port: config.port } : {}),
      },
    },
    pool: {
      max: config.poolMax,
      min: config.poolMin,
      acquire: config.poolAcquire,
      idle: config.poolIdle,
    },
    logging: false,
    define: {
      timestamps: false,
      freezeTableName: true,
    },
    timezone: '-05:00',
  });

const testCandidateConnection = async (config) => {
  const sequelize = createSequelizeForConfig(config);

  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT
        DB_NAME() AS [database_name],
        @@SERVERNAME AS server_name
    `);

    return {
      ok: true,
      meta: {
        databaseName: results?.[0]?.database_name || config.database,
        serverName: results?.[0]?.server_name || config.server,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  } finally {
    await sequelize.close().catch(() => {});
  }
};

const applyConfigToProcessEnv = (config) => {
  process.env.DB_SERVER = config.server;
  process.env.DB_INSTANCE = config.instanceName || '';
  process.env.DB_PORT = config.port ? String(config.port) : '';
  process.env.DB_FORCE_PORT = config.transport === 'port' ? 'true' : 'false';
  process.env.DB_NAME = config.database;
  process.env.DB_USER = config.username;
  process.env.DB_PASSWORD = config.password;
  process.env.DB_ENCRYPT = String(config.encrypt);
  process.env.DB_TRUST_SERVER_CERTIFICATE = String(config.trustServerCertificate);
  process.env.DB_REQUEST_TIMEOUT = String(config.requestTimeout);
  process.env.DB_CONNECT_TIMEOUT = String(config.connectTimeout);
  process.env.DB_POOL_MAX = String(config.poolMax);
  process.env.DB_POOL_MIN = String(config.poolMin);
  process.env.DB_POOL_ACQUIRE = String(config.poolAcquire);
  process.env.DB_POOL_IDLE = String(config.poolIdle);
};

module.exports = {
  applyConfigToProcessEnv,
  buildCandidatesFromEnv,
  testCandidateConnection,
};
