const Joi = require('joi');

const paymentMethods = ['efectivo', 'transferencia', 'credito', 'mixto'];
// Permitimos estados de flujo y de pago (Pagado/Vencido) para soportar UI actual
const saleStatuses = [
  'Activa',
  'Pendiente',
  'Finalizada',
  'Cancelada',
  'Pagado',
  'Vencido',
  'Debe',
  'En espera'
];

const createSaleSchema = Joi.object({
  id_inmueble: Joi.number().integer().required(),
  id_comprador: Joi.number().integer().required(),
  fecha_venta: Joi.date().iso().required(),
  valor_venta: Joi.number().positive().required(),
  medio_pago: Joi.string().valid(...paymentMethods).required(),
  estado: Joi.string().valid(...saleStatuses).default('Activa')
});

const updateSaleSchema = Joi.object({
  id_inmueble: Joi.number().integer(),
  id_comprador: Joi.number().integer(),
  fecha_venta: Joi.date().iso(),
  valor_venta: Joi.number().positive(),
  medio_pago: Joi.string().valid(...paymentMethods),
  estado: Joi.string().valid(...saleStatuses)
}).min(1);

const createTrackingSchema = Joi.object({
  id_estado_venta: Joi.number().integer().required(),
  id_comprador: Joi.number().integer().allow(null).optional(),
  fecha_estado_seguimiento: Joi.date().iso().required(),
  descripcion: Joi.string().max(500).allow('', null)
});

module.exports = {
  createSaleSchema,
  updateSaleSchema,
  createTrackingSchema
};
