const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Esquema de validación para crear super administrador
 */
const crearSuperAdminSchema = Joi.object({
  setupKey: Joi.string()
    .required()
    .min(10)
    .max(100)
    .messages({
      'string.empty': 'La clave de configuración es obligatoria',
      'string.min': 'La clave de configuración debe tener al menos 10 caracteres',
      'string.max': 'La clave de configuración debe tener máximo 100 caracteres',
      'any.required': 'La clave de configuración es obligatoria'
    }),

  adminData: Joi.object({
    nombre_completo: Joi.string()
      .required()
      .min(2)
      .max(100)
      .trim()
      .messages({
        'string.empty': 'El nombre completo es obligatorio',
        'string.min': 'El nombre completo debe tener al menos 2 caracteres',
        'string.max': 'El nombre completo debe tener máximo 100 caracteres',
        'any.required': 'El nombre completo es obligatorio'
      }),

    apellido_completo: Joi.string()
      .required()
      .min(2)
      .max(100)
      .trim()
      .messages({
        'string.empty': 'El apellido completo es obligatorio',
        'string.min': 'El apellido completo debe tener al menos 2 caracteres',
        'string.max': 'El apellido completo debe tener máximo 100 caracteres',
        'any.required': 'El apellido completo es obligatorio'
      }),

    numero_documento: Joi.string()
      .required()
      .min(5)
      .max(20)
      .pattern(/^[0-9]+$/)
      .trim()
      .messages({
        'string.empty': 'El número de documento es obligatorio',
        'string.min': 'El número de documento debe tener al menos 5 caracteres',
        'string.max': 'El número de documento debe tener máximo 20 caracteres',
        'string.pattern.base': 'El número de documento solo puede contener números',
        'any.required': 'El número de documento es obligatorio'
      }),

    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .messages({
        'string.email': 'Debe proporcionar un email válido',
        'string.empty': 'El email es obligatorio',
        'any.required': 'El email es obligatorio'
      }),

    telefono: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .min(7)
      .max(20)
      .required()
      .messages({
        'string.pattern.base': 'El teléfono debe contener solo números, espacios, guiones, paréntesis y el símbolo +',
        'string.min': 'El teléfono debe tener al menos 7 caracteres',
        'string.max': 'El teléfono debe tener máximo 20 caracteres',
        'string.empty': 'El teléfono es obligatorio',
        'any.required': 'El teléfono es obligatorio'
      }),

    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'string.pattern.base': 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número',
        'string.empty': 'La contraseña es obligatoria',
        'any.required': 'La contraseña es obligatoria'
      }),

    codigo_empleado: Joi.string()
      .required()
      .min(3)
      .max(20)
      .pattern(/^[A-Z0-9\-_]+$/i)
      .trim()
      .messages({
        'string.empty': 'El código de empleado es obligatorio',
        'string.min': 'El código de empleado debe tener al menos 3 caracteres',
        'string.max': 'El código de empleado debe tener máximo 20 caracteres',
        'string.pattern.base': 'El código de empleado solo puede contener letras, números, guiones y guiones bajos',
        'any.required': 'El código de empleado es obligatorio'
      }),

    fecha_ingreso: Joi.date()
      .optional()
      .max('now')
      .messages({
        'date.max': 'La fecha de ingreso no puede ser futura'
      }),

    departamento: Joi.string()
      .optional()
      .max(100)
      .trim()
      .messages({
        'string.max': 'El departamento debe tener máximo 100 caracteres'
      }),

    tipo_documento: Joi.string()
      .valid('CC', 'CE', 'TI', 'NIT', 'PAS')
      .optional()
      .messages({
        'any.only': 'El tipo de documento debe ser: CC, CE, TI, NIT o PAS'
      })
  })
  .required()
  .messages({
    'object.base': 'Los datos del administrador deben ser un objeto',
    'any.required': 'Los datos del administrador son obligatorios'
  })
});

module.exports = {
  crearSuperAdminSchema
};
