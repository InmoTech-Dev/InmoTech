const { isAllowedOrigin } = require('./runtime');

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.log('CORS bloqueado para origen:', origin);
    callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-CSRF-Token',
    'Cache-Control',
    'Pragma',
  ],
};

module.exports = corsOptions;
