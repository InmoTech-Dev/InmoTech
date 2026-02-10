const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Configuración de reintentos para la conexión a BD
const MAX_DB_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '2', 10);
const DB_RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS || '5000', 10);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithRetries = async () => {
  for (let attempt = 0; attempt <= MAX_DB_RETRIES; attempt++) {
    const ok = await testConnection();
    if (ok) return true;

    if (attempt < MAX_DB_RETRIES) {
      console.warn(
        `Reintento de conexion a BD en ${DB_RETRY_DELAY_MS}ms (intento ${attempt + 2}/${MAX_DB_RETRIES + 1})`
      );
      await delay(DB_RETRY_DELAY_MS);
    }
  }
  return false;
};

const startServer = async () => {
  try {
    console.log('Iniciando servidor...');

    const dbConnected = await connectWithRetries();
    if (!dbConnected) {
      const failHard = process.env.FAIL_ON_DB_ERROR === 'true';
      console.error('No se pudo conectar a la base de datos.');
      if (failHard) {
        console.error('Abortando inicio del servidor por configuracion FAIL_ON_DB_ERROR=true.');
        process.exit(1);
      } else {
        console.warn('Arrancando sin conexion a BD (modo degradado). Configura FAIL_ON_DB_ERROR=true para forzar salida.');
      }
    }

    const server = app.listen(PORT, () => {
      console.log('=================================================');
      console.log(`Servidor corriendo en puerto ${PORT}`);
      console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
      console.log(`Health: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}/health`);
      console.log('=================================================');
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} recibido. Cerrando servidor gracefully...`);
      server.close(() => {
        console.log('Servidor cerrado.');
        process.exit(0);
      });

      setTimeout(() => {
        console.log('No se pudo cerrar el servidor gracefully, forzando cierre...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      console.error('Excepcion no capturada:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Promesa rechazada no manejada:', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
