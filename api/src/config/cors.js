const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081',
      'http://localhost:52423',
      'http://127.0.0.1:52423',
      'http://localhost:52599',
      'http://127.0.0.1:52599',
      'http://localhost:9101',
      'http://127.0.0.1:9101',
      'capacitor://localhost',
      'ionic://localhost',
    ];

const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (
      isDevelopment &&
      (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
    ) {
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
