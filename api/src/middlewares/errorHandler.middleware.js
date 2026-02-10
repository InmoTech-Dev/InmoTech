const logger = require('../utils/logger');

// ✅ Middleware para manejar rutas no encontradas (404)
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  logger.warn(`404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  next(error);
};

// ✅ Middleware para manejar todos los errores
const errorHandler = (err, req, res, next) => {
  logger.error('Error capturado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Manejo específico de errores de transacción
  if (err.message && err.message.includes('Transaction cannot be rolled back')) {
    return res.status(500).json({
      success: false,
      message: 'Error de transacción en la base de datos. Intenta nuevamente.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Errores de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Errores de unicidad
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'El registro ya existe',
      field: err.errors[0]?.path
    });
  }

  // Errores de integridad referencial
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida a otro registro'
    });
  }

  // Errores de validación con Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  // Error por defecto
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// ⭐ IMPORTANTE: Exportar ambos middlewares
module.exports = { errorHandler, notFoundHandler };
