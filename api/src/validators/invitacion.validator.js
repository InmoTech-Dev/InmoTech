const Joi = require('joi');

const crearInvitacionSchema = Joi.object({
  id_persona: Joi.number().integer().required()
    .messages({
      'any.required': 'El id_persona es obligatorio',
      'number.base': 'El id_persona debe ser un número entero'
    })
});

const validarInvitacionSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'El token es obligatorio'
  })
});

const reenviarInvitacionSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'El token es obligatorio'
  })
});

const aceptarInvitacionSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'El token es obligatorio'
  }),
  codigo_6d: Joi.string().length(6).required().messages({
    'any.required': 'El código es obligatorio',
    'string.length': 'El código debe tener 6 dígitos'
  }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.max': 'La contraseña no puede exceder 100 caracteres',
      'string.pattern.base': 'La contraseña debe contener minúscula, mayúscula, número y carácter especial',
      'any.required': 'La contraseña es obligatoria'
    })
});

module.exports = {
  crearInvitacionSchema,
  validarInvitacionSchema,
  aceptarInvitacionSchema,
  reenviarInvitacionSchema
};
