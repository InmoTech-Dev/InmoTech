const Joi = require('joi');

const crearReporteSchema = Joi.object({
  id_inmueble: Joi.number().integer().required(),
  tipo_reporte: Joi.string().required(),
  titulo: Joi.string().max(200).allow('', null).optional(),
  descripcion: Joi.string().allow('', null).optional(),
  seguimiento_general: Joi.string().allow('', null).optional(),
  prioridad: Joi.string().max(20).allow('', null).optional(),
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').optional(),
  id_persona_reporta: Joi.number().integer().optional() // se setea desde el token si no viene
});

const actualizarReporteSchema = Joi.object({
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').optional(),
  titulo: Joi.string().max(200).allow('', null).optional(),
  descripcion: Joi.string().allow('', null).optional(),
  prioridad: Joi.string().max(20).allow('', null).optional(),
  fecha_resolucion: Joi.date().optional(),
  observaciones_resolucion: Joi.string().allow('', null).optional()
}).min(1).unknown(true);

const listarReportesSchema = Joi.object({
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').optional(),
  tipo_reporte: Joi.string().optional(),
  id_inmueble: Joi.number().integer().positive().optional(),
  pagina: Joi.number().integer().min(1).default(1),
  limite: Joi.number().integer().min(1).max(100).default(20),
  ordenar_por: Joi.string().valid('fecha_creacion', 'estado', 'tipo_reporte').default('fecha_creacion'),
  orden: Joi.string().valid('ASC', 'DESC').default('DESC')
});

const crearSeguimientoSchema = Joi.object({
  descripcion: Joi.string().required(),
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').default('Pendiente')
});

const actualizarSeguimientoSchema = Joi.object({
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').required()
});

const crearImagenSchema = Joi.object({
  url: Joi.string().uri().required()
});

const crearArchivoSchema = Joi.object({
  nombre: Joi.string().max(200).required(),
  url: Joi.string().uri().required()
});

const crearRubroSchema = Joi.object({
  nombre: Joi.string().max(100).required(),
  descripcion: Joi.string().allow('', null).optional(),
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').default('Pendiente'),
  progreso: Joi.number().integer().min(0).max(100).allow(null).optional()
});

const actualizarRubroSchema = Joi.object({
  nombre: Joi.string().max(100).optional(),
  descripcion: Joi.string().allow('', null).optional(),
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').optional(),
  progreso: Joi.number().integer().min(0).max(100).allow(null).optional()
}).min(1);

const crearSeguimientoRubroSchema = Joi.object({
  descripcion: Joi.string().required(),
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').required()
});

const actualizarSeguimientoRubroSchema = Joi.object({
  estado: Joi.string().valid('Pendiente', 'En Proceso', 'Completado', 'Cancelado').required(),
  descripcion: Joi.string().optional()
});

const autocompleteInmuebleSchema = Joi.object({
  q: Joi.string().min(1).max(100).required(),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

// Crear inmueble básico (para pruebas desde reportes-inmobiliarios)
const crearInmuebleSchema = Joi.object({
  registro_inmobiliario: Joi.string().max(50).required(),
  pais: Joi.string().max(50).required(),
  departamento: Joi.string().max(50).required(),
  ciudad: Joi.string().max(50).required(),
  direccion: Joi.string().max(100).required(),
  barrio: Joi.string().max(50).allow('', null).optional(),
  categoria: Joi.string().max(50).allow('', null).optional(),
  precio_venta: Joi.number().precision(2).allow(null).optional(),
  precio_arriendo: Joi.number().precision(2).allow(null).optional(),
  area_construida: Joi.number().precision(2).allow(null).optional(),
  area_terreno: Joi.number().precision(2).allow(null).optional(),
  descripcion: Joi.string().allow('', null).optional(),
  estado: Joi.string().valid('Disponible', 'Vendido', 'Arrendado', 'En Negociación').optional(),
  id_persona_propietario: Joi.number().integer().positive().optional()
});

module.exports = {
  crearReporteSchema,
  actualizarReporteSchema,
  listarReportesSchema,
  crearSeguimientoSchema,
  actualizarSeguimientoSchema,
  crearImagenSchema,
  crearArchivoSchema,
  crearRubroSchema,
  actualizarRubroSchema,
  crearSeguimientoRubroSchema,
  actualizarSeguimientoRubroSchema,
  autocompleteInmuebleSchema,
  crearInmuebleSchema
};
