const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Override del formato de fecha para SQL Server
Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
  date = this._applyTimezone(date, options);
  return date.format('YYYY-MM-DD HH:mm:ss.SSS');
};


const REQUEST_TIMEOUT = parseInt(process.env.DB_REQUEST_TIMEOUT || '60000', 10);
const CONNECT_TIMEOUT = parseInt(process.env.DB_CONNECT_TIMEOUT || '60000', 10);

const SERVER = process.env.DB_SERVER || 'localhost';
// Si se define DB_PORT, priorizamos puerto y anulamos instancia (mssql no permite ambos)
const PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;
const INSTANCE = PORT ? '' : (process.env.DB_INSTANCE || '');



const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {

    host: SERVER,
    dialect: 'mssql',
    dialectOptions: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      options: {
        enableArithAbort: true,
        useUTC: false,
        requestTimeout: REQUEST_TIMEOUT,
        connectTimeout: CONNECT_TIMEOUT,
        ...(INSTANCE ? { instanceName: INSTANCE } : {}),
        ...(PORT ? { port: PORT } : {}),
      }
    },

    host: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    dialect: 'mssql',
  dialectOptions: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    // Forzar timeout ampliado en cada request de MSSQL (tedious usa options.requestTimeout)
    requestTimeout: 60000,
    options: {
      enableArithAbort: true,
      useUTC: false,
      requestTimeout: 60000
    }
  },

    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000
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
  }
);

const testConnection = async () => {
  try {
    logger.info('🔌 Intentando conectar a SQL Server...');

    logger.info(`   Servidor: ${SERVER}`);
    logger.info(`   Instancia: ${INSTANCE || '(por defecto)'}`);
    logger.info(`   Puerto: ${PORT || '(usando instancia/dinámico)'}`);

    logger.info(`   Servidor: ${process.env.DB_SERVER}`);

    logger.info(`   Base de datos: ${process.env.DB_NAME}`);
    
    await sequelize.authenticate();
    logger.info('✓ Conexión exitosa a SQL Server');
    
    // ⭐ CORRECCIÓN: Query SQL corregido con alias entre corchetes
    const [results] = await sequelize.query(`
      SELECT 
        @@VERSION AS version, 
        DB_NAME() AS [database_name],
        @@SERVERNAME AS server_name
    `);
    
    logger.info(`✓ Base de datos: ${results[0].database_name}`);
    logger.info(`✓ Servidor: ${results[0].server_name}`);
    
    return true;
  } catch (error) {
    logger.error('✗ Error al conectar con SQL Server:');
    logger.error(`  - Servidor: ${process.env.DB_SERVER}`);
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
