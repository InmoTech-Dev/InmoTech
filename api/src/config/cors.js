const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081',
      'http://localhost:52423',  // Flutter Web puerto actual
      'http://127.0.0.1:52423', // Flutter Web puerto actual
      'http://localhost:52599', // Flutter DevTools
      'http://127.0.0.1:52599', // Flutter DevTools
      'http://localhost:9101',   // Flutter DevTools
      'http://127.0.0.1:9101',   // Flutter DevTools
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Durante desarrollo, permitir cualquier origen localhost
    if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      console.log('CORS bloqueado para origen:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'headers',
    'Cache-Control',
    'Pragma'
  ]
};

module.exports = corsOptions;
