const Joi = require('joi');

const leaseStatuses = ['Activo', 'Al día', 'Pendiente', 'Debe', 'Finalizado'];

const documentNumberSchema = Joi.string().trim().min(7).max(10);

const validateMinimumLeaseMonth = (value, helpers) => {
  const fechaInicio = value.fecha_inicio ? new Date(value.fecha_inicio) : null;
  const fechaFinalizacion = value.fecha_finalizacion ? new Date(value.fecha_finalizacion) : null;

  if (!fechaInicio || !fechaFinalizacion || Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFinalizacion.getTime())) {
    return value;
  }

  const minimumEndDate = new Date(fechaInicio.getTime());
  minimumEndDate.setMonth(minimumEndDate.getMonth() + 1);

  if (fechaFinalizacion < minimumEndDate) {
    return helpers.message('La duración mínima del contrato de arriendo es de un mes.');
  }

  return value;
};

const createLeaseSchema = Joi.object({
  id_cliente: Joi.number().integer().required(),
  id_inmueble: Joi.number().integer().required(),
  id_codeudor: Joi.number().integer().optional(),
  fecha_cobro: Joi.date().iso().optional(),
  codeudor: Joi.object({
    tipo_documento: Joi.string().required(),
    numero_documento: documentNumberSchema.required(),
    nombre_completo: Joi.string().allow('', null),
    apellido_completo: Joi.string().allow('', null),
    correo: Joi.string().email().allow('', null),
    telefono: Joi.string().allow('', null),
    actividad_economica: Joi.string().valid('Empleado', 'Independiente').allow('', null)
  }).optional(),
  fecha_inicio: Joi.date().iso().required(),
  fecha_finalizacion: Joi.date().iso().required(),
  valor_mensual: Joi.number().positive().required()
}).custom(validateMinimumLeaseMonth);

const updateLeaseSchema = Joi.object({
  id_cliente: Joi.number().integer(),
  id_inmueble: Joi.number().integer(),
  id_codeudor: Joi.number().integer().allow(null),
  codeudor: Joi.object({
    tipo_documento: Joi.string().required(),
    numero_documento: documentNumberSchema.required(),
    nombre_completo: Joi.string().allow('', null),
    apellido_completo: Joi.string().allow('', null),
    correo: Joi.string().email().allow('', null),
    telefono: Joi.string().allow('', null),
    actividad_economica: Joi.string().valid('Empleado', 'Independiente').allow('', null)
  }).optional(),
  fecha_inicio: Joi.date().iso(),
  fecha_finalizacion: Joi.date().iso(),
  valor_mensual: Joi.number().positive(),
  estado: Joi.string().valid(...leaseStatuses)
}).min(1).custom(validateMinimumLeaseMonth);

const updateLeaseStatusSchema = Joi.object({
  estado: Joi.string().valid(...leaseStatuses).required(),
  comentario: Joi.string().max(500).allow('', null),
  descripcion: Joi.string().max(500).allow('', null)
});

const extendLeaseSchema = Joi.object({
  fecha_finalizacion: Joi.date().iso(),
  comentario: Joi.string().max(500).allow('', null)
});

const adjustRentSchema = Joi.object({
  fecha_reajuste: Joi.date().iso().required(),
  valor_mensual: Joi.number().positive().required(),
  comentario: Joi.string().max(500).allow('', null)
});

const registerPreNoticeSchema = Joi.object({
  comentario: Joi.string().max(1000).allow('', null),
  url_soporte: Joi.string().uri().max(500).allow('', null),
  decision: Joi.string().valid('Aceptado', 'Rechazado').required()
}).or('comentario', 'url_soporte');

const registerLeaseContractSchema = Joi.object({
  url_contrato: Joi.string().uri().max(500).required(),
  comentario: Joi.string().max(1000).allow('', null)
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
  estado: Joi.string().valid('Pendiente', 'Confirmado', 'Negado', 'En revisión').optional(),
  observaciones: Joi.string().allow('', null)
});

module.exports = {
  createLeaseSchema,
  updateLeaseSchema,
  updateLeaseStatusSchema,
  extendLeaseSchema,
  adjustRentSchema,
  registerPreNoticeSchema,
  registerLeaseContractSchema,
  createPaymentSchema,
  updatePaymentSchema,
  createReceiptSchema
};
