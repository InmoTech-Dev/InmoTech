const Joi = require('joi');

// Validacion para crear persona (alta por invitacion administrativa)
const crearPersonaSchema = Joi.object({
  tipo_documento: Joi.string()
    .valid('CC', 'CE', 'TI', 'NIT', 'PAS')
    .required(),

  numero_documento: Joi.string()
    .min(5)
    .max(20)
    .pattern(/^[0-9A-Z]+$/)
    .required(),

  nombre_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .required(),

  apellido_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .required(),

  correo: Joi.string()
    .email()
    .max(100)
    .allow('', null)
    .optional(),

  telefono: Joi.string()
    .min(10)
    .max(20)
    .pattern(/^(\+57\s?)?[3]\d{2}\s?\d{3}\s?\d{4}$|^\+57\s?3\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/)
    .allow('', null)
    .optional(),

  tiene_cuenta: Joi.boolean()
    .optional()
    .default(false),

  rol: Joi.string()
    .valid('Usuario', 'Propietario', 'Empleado', 'Administrador', 'Super Administrador')
    .optional()
    .default('Usuario'),

  estado: Joi.boolean()
    .optional()
    .default(true)
});

// Validación para actualizar persona
const actualizarPersonaSchema = Joi.object({
  primer_nombre: Joi.string().min(2).max(50).pattern(/^[a-zA-ZÀ-ÿ\s]+/).optional(),
  segundo_nombre: Joi.string().min(2).max(50).pattern(/^[a-zA-ZÀ-ÿ\s]+/).allow('', null).optional(),
  primer_apellido: Joi.string().min(2).max(50).pattern(/^[a-zA-ZÀ-ÿ\s]+/).optional(),
  segundo_apellido: Joi.string().min(2).max(50).pattern(/^[a-zA-ZÀ-ÿ\s]+/).allow('', null).optional(),

  nombre_completo: Joi.string().min(2).max(100).pattern(/^[a-zA-ZÀ-ÿ\s]+$/).optional(),
  apellido_completo: Joi.string().min(2).max(100).pattern(/^[a-zA-ZÀ-ÿ\s]+$/).optional(),

  correo: Joi.string().email().max(100).allow('', null).optional(),
  telefono: Joi.string()
    .min(10)
    .max(20)
    .pattern(/^(\+57\s?)?[3]\d{2}\s?\d{3}\s?\d{4}$|^\+57\s?3\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/)
    .allow('', null)
    .optional(),
  tipo_documento: Joi.string().valid('CC', 'CE', 'TI', 'NIT', 'PAS').optional(),
  numero_documento: Joi.string().min(5).max(20).pattern(/^[0-9A-Z]+$/).optional(),

  estado: Joi.boolean().optional()
}).min(1);

// Validación para buscar personas
const buscarPersonaSchema = Joi.object({
  tipo_documento: Joi.string()
    .valid('CC', 'CE', 'TI', 'NIT', 'PAS')
    .required(),

  numero_documento: Joi.string()
    .min(1)
    .max(20)
    .required()
});

module.exports = {
  crearPersonaSchema,
  actualizarPersonaSchema,
  buscarPersonaSchema
};
