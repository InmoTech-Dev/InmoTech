const Joi = require('joi');

// Validación para crear rol
const crearRolSchema = Joi.object({
  nombre_rol: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .required()
    .messages({
      'string.min': 'El nombre del rol debe tener al menos 3 caracteres',
      'string.max': 'El nombre del rol no puede exceder 50 caracteres',
      'string.pattern.base': 'El nombre del rol solo puede contener letras y espacios',
      'any.required': 'El nombre del rol es obligatorio'
    }),

  descripcion: Joi.string()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'La descripción no puede exceder 200 caracteres'
    }),

  es_rol_administrativo: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'El campo es_rol_administrativo debe ser un valor booleano'
    }),

  permisos: Joi.object().pattern(
      Joi.string(),
      Joi.object().pattern(Joi.string(), Joi.boolean())
    ).optional()
});

// Validación para actualizar rol
const actualizarRolSchema = Joi.object({
  nombre_rol: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .optional()
    .messages({
      'string.min': 'El nombre del rol debe tener al menos 3 caracteres',
      'string.max': 'El nombre del rol no puede exceder 50 caracteres',
      'string.pattern.base': 'El nombre del rol solo puede contener letras y espacios'
    }),

  estado: Joi.boolean()
    .optional(),

  permisos: Joi.object().pattern(
      Joi.string(),
      Joi.object().pattern(Joi.string(), Joi.boolean())
    ).optional()
})
  .min(1)
  .messages({
    'object.min': 'Debe proporcionar al menos un campo para actualizar'
  });

// Validación para asignar rol
const asignarRolSchema = Joi.object({
  // Los parámetros vienen en la URL, no se necesita validación adicional
});

// Validación para remover rol
const removerRolSchema = Joi.object({
  // Los parámetros vienen en la URL, no se necesita validación adicional
});

module.exports = {
  crearRolSchema,
  actualizarRolSchema,
  asignarRolSchema,
  removerRolSchema
};
