const Joi = require('joi');

const leaseStatuses = ['Activo', 'Pendiente', 'Finalizado', 'Cancelado', 'Al día', 'Recuperación'];

const createLeaseSchema = Joi.object({
  id_cliente: Joi.number().integer().required(),
  id_inmueble: Joi.number().integer().required(),
  id_codeudor: Joi.number().integer().optional(),
  codeudor: Joi.object({
    tipo_documento: Joi.string().required(),
    numero_documento: Joi.string().required(),
    nombre_completo: Joi.string().allow('', null),
    apellido_completo: Joi.string().allow('', null),
    correo: Joi.string().email().allow('', null),
    telefono: Joi.string().allow('', null)
  }).optional(),
  fecha_inicio: Joi.date().iso().required(),
  fecha_finalizacion: Joi.date().iso().required(),
  valor_mensual: Joi.number().positive().required()
});

const updateLeaseSchema = Joi.object({
  id_cliente: Joi.number().integer(),
  id_inmueble: Joi.number().integer(),
  id_codeudor: Joi.number().integer().allow(null),
  codeudor: Joi.object({
    tipo_documento: Joi.string().required(),
    numero_documento: Joi.string().required(),
    nombre_completo: Joi.string().allow('', null),
    apellido_completo: Joi.string().allow('', null),
    correo: Joi.string().email().allow('', null),
    telefono: Joi.string().allow('', null)
  }).optional(),
  fecha_inicio: Joi.date().iso(),
  fecha_finalizacion: Joi.date().iso(),
  valor_mensual: Joi.number().positive(),
  estado: Joi.string().valid(...leaseStatuses)
}).min(1);

const updateLeaseStatusSchema = Joi.object({
  estado: Joi.string().valid(...leaseStatuses).required(),
  comentario: Joi.string().max(500).allow('', null)
});

const createPaymentSchema = Joi.object({
  fecha_cobro: Joi.date().iso().required(),
  fecha_limite: Joi.date().iso().required(),
  valor_pago: Joi.number().positive().required(),
  estado: Joi.string().valid('Pendiente', 'Pagado', 'Vencido').default('Pendiente')
});

const updatePaymentSchema = Joi.object({
  estado: Joi.string().valid('Pendiente', 'Pagado', 'Vencido').required(),
  fecha_pago: Joi.date().iso().optional()
});

const createReceiptSchema = Joi.object({
  id_cobro: Joi.number().integer().optional(),
  url_comprobante: Joi.string().max(500).required(),
  entidad_bancaria: Joi.string().max(100).required(),
  referencia_bancaria: Joi.string().max(100).required(),
  monto_pagado: Joi.number().positive().required(),
  fecha_pago: Joi.date().iso().required(),
  estado: Joi.string().valid('Pendiente', 'Confirmado', 'Negado', 'En revision').optional(),
  observaciones: Joi.string().allow('', null)
});

module.exports = {
  createLeaseSchema,
  updateLeaseSchema,
  updateLeaseStatusSchema,
  createPaymentSchema,
  updatePaymentSchema,
  createReceiptSchema
};
