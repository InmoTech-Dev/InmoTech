const Joi = require('joi');

const documentTypes = ['CC', 'CE', 'NIT', 'Pasaporte', 'TI'];
const tenantStatuses = ['Activo', 'Inactivo', 'Moroso', 'Proceso'];
const tenantTypes = ['Potencial', 'En Proceso', 'Activo', 'Inactivo'];

const createRenantSchema = Joi.object({
  tipo_documento: Joi.string().valid(...documentTypes).required(),
  numero_documento: Joi.string().max(20).required(),
  nombre_completo: Joi.string().max(100).required(),
  apellido_completo: Joi.string().max(100).required(),
  correo: Joi.string().email().required(),
  telefono: Joi.string().max(20).allow('', null),
  tipo_arrendatario: Joi.string().valid(...tenantTypes).default('Potencial'),
  ciudad_residencia: Joi.string().max(50).allow('', null),
  direccion_anterior: Joi.string().max(100).allow('', null),
  contacto_emergencia_nombre: Joi.string().max(100).allow('', null).optional(),
  contacto_emergencia_telefono: Joi.string().max(20).allow('', null).optional(),
  contacto_emergencia_parentesco: Joi.string().max(50).allow('', null).optional(),
  observaciones: Joi.string().allow('', null).optional(),
  estado: Joi.string().valid(...tenantStatuses).default('Activo'),
  registro_arrendatario: Joi.string().max(20).allow(null).optional()
});

const updateRenantSchema = Joi.object({
  nombre_completo: Joi.string().max(100),
  apellido_completo: Joi.string().max(100),
  correo: Joi.string().email(),
  telefono: Joi.string().max(20),
  tipo_arrendatario: Joi.string().valid(...tenantTypes),
  ciudad_residencia: Joi.string().max(50).allow('', null),
  direccion_anterior: Joi.string().max(100).allow('', null),
  contacto_emergencia_nombre: Joi.string().max(100).allow('', null),
  contacto_emergencia_telefono: Joi.string().max(20).allow('', null),
  contacto_emergencia_parentesco: Joi.string().max(50).allow('', null),
  observaciones: Joi.string().allow('', null),
  estado: Joi.string().valid(...tenantStatuses)
}).min(1);

const searchRenantsSchema = Joi.object({
  tipo_documento: Joi.string().valid(...documentTypes),
  numero_documento: Joi.string().max(20),
  nombre: Joi.string().max(100),
  status: Joi.string().valid(...tenantStatuses),
  tipo_arrendatario: Joi.string().valid(...tenantTypes)
});

module.exports = {
  createRenantSchema,
  updateRenantSchema,
  searchRenantsSchema
};
