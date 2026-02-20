const logger = require('../utils/logger');

const mapValidationErrors = (error) => {
  return error.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
};

const buildErrorResponse = (message, errors) => {
  return {
    success: false,
    message,
    errors: errors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {})
  };
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = mapValidationErrors(error);

      logger.warn('Validacion fallida', {
        method: req.method,
        path: req.originalUrl || req.url,
        errors
      });

      return res.status(400).json(buildErrorResponse('Error de validacion', errors));
    }

    req.validatedData = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = mapValidationErrors(error);

      logger.warn('Validacion de query fallida', {
        method: req.method,
        path: req.originalUrl || req.url,
        errors
      });

      return res
        .status(400)
        .json(buildErrorResponse('Error de validacion en parametros de consulta', errors));
    }

    req.validatedQuery = value;
    next();
  };
};

module.exports = { validate, validateQuery };
