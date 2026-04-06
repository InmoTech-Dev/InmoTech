const Joi = require('joi');

const transferAdminHolderSchema = Joi.object({
  target_persona_id: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'El target_persona_id debe ser numérico',
      'number.integer': 'El target_persona_id debe ser un entero',
      'number.min': 'El target_persona_id no puede ser negativo',
      'any.required': 'El target_persona_id es obligatorio',
    }),
  disable_previous_account: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'disable_previous_account debe ser booleano',
    }),
  reason: Joi.string()
    .trim()
    .min(10)
    .max(300)
    .required()
    .messages({
      'string.base': 'La razón debe ser texto',
      'string.empty': 'La razón es obligatoria',
      'string.min': 'La razón debe tener al menos 10 caracteres',
      'string.max': 'La razón debe tener máximo 300 caracteres',
      'any.required': 'La razón es obligatoria',
    }),
});

module.exports = {
  transferAdminHolderSchema,
};
