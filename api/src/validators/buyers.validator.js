const Joi = require('joi');

const documentTypes = ['CC', 'CE', 'NIT', 'Pasaporte', 'TI'];
const buyerTypes = ['Potencial', 'En Proceso', 'Finalizado'];
const buyerStatuses = ['Activo', 'Inactivo', 'Proceso'];

const createBuyerSchema = Joi.object({
  tipo_documento: Joi.string().valid(...documentTypes).required(),
  numero_documento: Joi.string().max(20).required(),
  nombre_completo: Joi.string().max(100).required(),
  apellido_completo: Joi.string().max(100).required(),
  correo: Joi.string().email().required(),
  telefono: Joi.string().max(20).allow('', null),
  tipo_comprador: Joi.string().valid(...buyerTypes).default('Potencial'),
  ciudad_residencia: Joi.string().max(50).allow('', null),
  direccion_anterior: Joi.string().max(100).allow('', null),
  observaciones: Joi.string().allow('', null),
  estado: Joi.string().valid(...buyerStatuses).default('Activo'),
  registro_comprador: Joi.string().max(20)
});

const updateBuyerSchema = Joi.object({
  nombre_completo: Joi.string().max(100),
  apellido_completo: Joi.string().max(100),
  correo: Joi.string().email(),
  telefono: Joi.string().max(20),
  tipo_comprador: Joi.string().valid(...buyerTypes),
  ciudad_residencia: Joi.string().max(50).allow('', null),
  direccion_anterior: Joi.string().max(100).allow('', null),
  observaciones: Joi.string().allow('', null),
  estado: Joi.string().valid(...buyerStatuses)
}).min(1);

const searchBuyersSchema = Joi.object({
  tipo_documento: Joi.string().valid(...documentTypes),
  numero_documento: Joi.string().max(20),
  criterio: Joi.string().max(100),
  nombre: Joi.string().max(100),
  status: Joi.string().valid(...buyerStatuses),
  estado: Joi.string().valid(...buyerStatuses),
  search: Joi.string().max(100),
  tipo_comprador: Joi.string().valid(...buyerTypes)
});

module.exports = {
  createBuyerSchema,
  updateBuyerSchema,
  searchBuyersSchema
};
