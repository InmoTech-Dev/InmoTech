const Joi = require('joi');

const paymentMethods = ['efectivo', 'transferencia', 'credito', 'mixto'];
// Estados generales de la venta (columna Ventas.estado)
const saleStatuses = ['Activa', 'Finalizada', 'Cancelada'];
const optionalDocumentNumberSchema = Joi.string().trim().min(7).max(10).allow(null, '');

const createSaleSchema = Joi.object({
  id_inmueble: Joi.number().integer().required(),
  id_comprador: Joi.number().integer().required(),
  fecha_venta: Joi.date().iso().required(),
  valor_venta: Joi.number().positive().required(),
  medio_pago: Joi.string().valid(...paymentMethods).required(),
  estado: Joi.string().valid(...saleStatuses).default('Activa'),
  // Datos "congelados" del vendedor al momento de crear la venta
  tipo_doc_vendedor: Joi.string().max(20).allow(null, ''),
  numero_doc_vendedor: optionalDocumentNumberSchema,
  nombre_vendedor: Joi.string().max(200).allow(null, ''),
  correo_vendedor: Joi.string().email().max(150).allow(null, ''),
  telefono_vendedor: Joi.string().max(50).allow(null, '')
});

const updateSaleSchema = Joi.object({
  id_inmueble: Joi.number().integer(),
  id_comprador: Joi.number().integer(),
  fecha_venta: Joi.date().iso(),
  valor_venta: Joi.number().positive(),
  medio_pago: Joi.string().valid(...paymentMethods),
  estado: Joi.string().valid(...saleStatuses),
  tipo_doc_vendedor: Joi.string().max(20).allow(null, ''),
  numero_doc_vendedor: optionalDocumentNumberSchema,
  nombre_vendedor: Joi.string().max(200).allow(null, ''),
  correo_vendedor: Joi.string().email().max(150).allow(null, ''),
  telefono_vendedor: Joi.string().max(50).allow(null, '')
}).min(1);

const createTrackingSchema = Joi.object({
  id_estado_venta: Joi.number().integer().required(),
  id_comprador: Joi.number().integer().allow(null).optional(),
  id_persona: Joi.number().integer().allow(null).optional(),
  fecha_estado_seguimiento: Joi.date().iso().optional(),
  descripcion: Joi.string().max(500).allow('', null)
});

const changeStatusSchema = Joi.object({
  id_estado_venta: Joi.number().integer().required(),
  id_persona: Joi.number().integer().allow(null).optional(),
  fecha_estado_seguimiento: Joi.date().iso().optional(),
  descripcion: Joi.string().max(500).allow('', null)
});

const createAttachmentSchema = Joi.object({
  tipo: Joi.string().valid('comprobante', 'contrato').required()
});

module.exports = {
  createSaleSchema,
  updateSaleSchema,
  createTrackingSchema,
  changeStatusSchema,
  createAttachmentSchema
};
