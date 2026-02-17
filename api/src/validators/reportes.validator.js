const Joi = require('joi');

// Validación para crear reporte
const crearReporteSchema = Joi.object({
  tipo_reporte: Joi.string()
    .valid('citas', 'inmuebles', 'personas', 'ventas', 'general')
    .required()
    .messages({
      'any.only': 'Tipo de reporte inválido',
      'any.required': 'El tipo de reporte es obligatorio'
    }),

  titulo: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'El título debe tener al menos 5 caracteres',
      'string.max': 'El título no puede exceder 200 caracteres',
      'any.required': 'El título es obligatorio'
    }),

  descripcion: Joi.string()
    .max(500)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'La descripción no puede exceder 500 caracteres'
    }),

  parametros: Joi.object()
    .optional(),

  formato: Joi.string()
    .valid('json', 'pdf', 'excel', 'csv')
    .optional()
    .default('json')
    .messages({
      'any.only': 'Formato inválido'
    })
});

// Validación para generar reporte de citas
const generarReporteCitasSchema = Joi.object({
  fecha_desde: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': 'La fecha desde debe tener formato ISO (YYYY-MM-DD)',
      'any.required': 'La fecha desde es obligatoria'
    }),

  fecha_hasta: Joi.date()
    .iso()
    .when('fecha_desde', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('fecha_desde'))
    })
    .required()
    .messages({
      'date.format': 'La fecha hasta debe tener formato ISO (YYYY-MM-DD)',
      'date.greater': 'La fecha hasta debe ser posterior a la fecha desde',
      'any.required': 'La fecha hasta es obligatoria'
    }),

  id_estado_cita: Joi.number()
    .integer()
    .positive()
    .optional(),

  id_servicio: Joi.number()
    .integer()
    .positive()
    .optional(),

  id_agente: Joi.number()
    .integer()
    .positive()
    .optional()
});

// Validación para generar reporte de inmuebles
const generarReporteInmueblesSchema = Joi.object({
  ciudad: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  categoria: Joi.string()
    .valid('Apartamento', 'Casa', 'Local', 'Oficina', 'Bodega', 'Lote', 'Finca', 'Otro')
    .optional(),

  estado: Joi.boolean()
    .optional()
    .default(true)
});

// Validación para actualizar estado del reporte
const actualizarEstadoReporteSchema = Joi.object({
  estado: Joi.string()
    .valid('generado', 'procesando', 'completado', 'error', 'cancelado')
    .required()
    .messages({
      'any.only': 'Estado inválido',
      'any.required': 'El estado es obligatorio'
    })
});

// Validación para listar reportes
const listarReportesSchema = Joi.object({
  tipo_reporte: Joi.string()
    .valid('citas', 'inmuebles', 'personas', 'ventas', 'general')
    .optional(),

  estado: Joi.string()
    .valid('generado', 'procesando', 'completado', 'error', 'cancelado')
    .optional(),

  fecha_desde: Joi.date()
    .iso()
    .optional(),

  fecha_hasta: Joi.date()
    .iso()
    .when('fecha_desde', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('fecha_desde'))
    })
    .optional()
    .messages({
      'date.greater': 'La fecha hasta debe ser posterior a la fecha desde'
    }),

  id_persona_reporta: Joi.number()
    .integer()
    .positive()
    .optional(),

  pagina: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),

  limite: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.max': 'El límite máximo es 100'
    }),

  ordenar_por: Joi.string()
    .valid('fecha_generacion', 'titulo', 'tipo_reporte', 'estado')
    .optional()
    .default('fecha_generacion'),

  orden: Joi.string()
    .valid('ASC', 'DESC')
    .optional()
    .default('DESC')
});

module.exports = {
  crearReporteSchema,
  generarReporteCitasSchema,
  generarReporteInmueblesSchema,
  actualizarEstadoReporteSchema,
  listarReportesSchema
};
