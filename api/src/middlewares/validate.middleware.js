const logger = require('../utils/logger');

const validate = (schema) => {
  return (req, res, next) => {
    // 🔍 DEBUGGING: Mostrar qué llega
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 VALIDANDO REQUEST DE REGISTRO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 Body recibido:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      // 🔍 DEBUGGING: Mostrar errores
      console.log('❌ ERRORES DE VALIDACIÓN:');
      errors.forEach((err, index) => {
        console.log(`   ${index + 1}. Campo: "${err.field}"`);
        console.log(`      Mensaje: ${err.message}`);
      });
      console.log('═══════════════════════════════════════════════════════');

      // Intentar log con logger
      try {
        logger.warn('Validación fallida:', { body: req.body, errors });
      } catch (e) {
        console.log('⚠️  Logger no funcionó');
      }

      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.reduce((acc, err) => {
          acc[err.field] = err.message;
          return acc;
        }, {})
      });
    }

    // ✅ CORRECCIÓN: Estas líneas deben estar FUERA del if (error)
    console.log('✅ Validación exitosa');
    console.log('═══════════════════════════════════════════════════════');
    
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
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      console.log('❌ VALIDACIÓN DE QUERY FALLIDA:');
      console.log('Query:', JSON.stringify(req.query, null, 2));
      console.log('Errores:', errors);

      try {
        logger.warn('Validación de query fallida:', { errors, query: req.query });
      } catch (e) {
        console.log('⚠️  Logger no funcionó');
      }

      return res.status(400).json({
        success: false,
        message: 'Error de validación en parámetros de consulta',
        errors: errors.reduce((acc, err) => {
          acc[err.field] = err.message;
          return acc;
        }, {})
      });
    }

    req.validatedQuery = value;
    next();
  };
};

module.exports = { validate, validateQuery };
