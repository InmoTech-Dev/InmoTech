const Joi = require('joi');

const comodidadSchema = Joi.object({
  nombre: Joi.string()
    .max(100)
    .required()
    .messages({
      'any.required': 'Cada comodidad debe tener un nombre',
      'string.max': 'El nombre de la comodidad es demasiado largo'
    }),
  cantidad: Joi.number()
    .integer()
    .min(0)
    .max(999)
    .default(1)
    .messages({
      'number.min': 'La cantidad de la comodidad no puede ser negativa',
      'number.max': 'La cantidad de la comodidad es demasiado grande'
    }),
  seleccionada: Joi.boolean().default(true),
  custom: Joi.boolean().default(false)
});

const propietarioSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  nombreCompleto: Joi.string().max(150).optional(),
  nombre: Joi.string().max(150).optional(),
  email: Joi.string().email().allow('', null).optional(),
  telefono: Joi.string().allow('', null).optional(),
  documento: Joi.string().allow('', null).optional()
}).optional();

const CATEGORIAS_MIN_COMODIDADES = new Set(['casa', 'apartamento']);

const contarComodidadesSeleccionadas = (comodidades = []) =>
  Array.isArray(comodidades)
    ? comodidades.filter((item) => item && item.seleccionada !== false && (item.nombre || item.id_comodidad)).length
    : 0;

// Validación para crear inmueble
const crearInmuebleSchema = Joi.object({
  registro_inmobiliario: Joi.string()
    .min(5)
    .max(50)
    .pattern(/^[0-9A-Z\-]+$/)
    .required()
    .messages({
      'string.min': 'El registro inmobiliario debe tener al menos 5 caracteres',
      'string.max': 'El registro inmobiliario no puede exceder 50 caracteres',
      'string.pattern.base': 'El registro inmobiliario solo puede contener números, letras mayúsculas y guiones',
      'any.required': 'El registro inmobiliario es obligatorio'
    }),

  direccion: Joi.string()
    .min(10)
    .max(200)
    .required()
    .messages({
      'string.min': 'La dirección debe tener al menos 10 caracteres',
      'string.max': 'La dirección no puede exceder 200 caracteres',
      'any.required': 'La dirección es obligatoria'
    }),

  barrio: Joi.string()
    .min(2)
    .max(100)
    .allow('', null)
    .optional(),

  ciudad: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'La ciudad debe tener al menos 2 caracteres',
      'string.max': 'La ciudad no puede exceder 100 caracteres',
      'any.required': 'La ciudad es obligatoria'
    }),

  departamento: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El departamento debe tener al menos 2 caracteres',
      'string.max': 'El departamento no puede exceder 100 caracteres',
      'any.required': 'El departamento es obligatorio'
    }),

  pais: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'El país debe tener al menos 2 caracteres',
      'string.max': 'El país no puede exceder 100 caracteres',
      'any.required': 'El país es obligatorio'
    }),

  categoria: Joi.string()
    .valid('Apartamento', 'Casa', 'Local', 'Oficina', 'Bodega', 'Lote', 'Finca', 'Otro')
    .required()
    .messages({
      'any.only': 'Categoría inválida',
      'any.required': 'La categoría es obligatoria'
    }),

  precio_venta: Joi.number()
    .positive()
    .max(999999999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El precio de venta debe ser positivo',
      'number.max': 'El precio de venta es demasiado alto'
    }),

  precio_arriendo: Joi.number()
    .positive()
    .max(999999999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El precio de arriendo debe ser positivo',
      'number.max': 'El precio de arriendo es demasiado alto'
    }),

  area_construida: Joi.number()
    .positive()
    .max(999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El área construida debe ser positiva',
      'number.max': 'El área construida es demasiado grande'
    }),

  area_privada: Joi.number()
    .positive()
    .max(999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El área privada debe ser positiva',
      'number.max': 'El área privada es demasiado grande'
    }),

  habitaciones: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'Las habitaciones no pueden ser negativas',
      'number.max': 'Demasiadas habitaciones'
    }),

  banos: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'Los baños no pueden ser negativos',
      'number.max': 'Demasiados baños'
    }),

  parqueaderos: Joi.number()
    .integer()
    .min(0)
    .max(20)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'Los parqueaderos no pueden ser negativos',
      'number.max': 'Demasiados parqueaderos'
    }),

  descripcion: Joi.string()
    .max(1000)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'La descripción no puede exceder 1000 caracteres'
    }),

  caracteristicas: Joi.array()
    .items(Joi.string().max(100))
    .max(50)
    .allow(null)
    .optional()
    .messages({
      'array.max': 'Demasiadas características'
    }),

  comodidades: Joi.array()
    .items(comodidadSchema)
    .max(50)
    .allow(null)
    .optional()
    .messages({
      'array.max': 'Demasiadas comodidades'
    }),

  imagenes: Joi.array()
    .items(Joi.string().uri())
    .max(20)
    .allow(null)
    .optional()
    .messages({
      'array.max': 'Demasiadas imágenes',
      'string.uri': 'URL de imagen inválida'
    }),

  propietario_id: Joi.number().integer().positive().optional(),
  propietario: propietarioSchema.optional(),

  estado: Joi.boolean()
    .optional()
    .default(true),

  destacado: Joi.boolean()
    .optional()
    .default(false)
})
  .custom((value, helpers) => {
    const categoria = String(value?.categoria || '').trim().toLowerCase();
    if (!CATEGORIAS_MIN_COMODIDADES.has(categoria)) {
      return value;
    }

    const totalSeleccionadas = contarComodidadesSeleccionadas(value?.comodidades);
    if (totalSeleccionadas < 2) {
      return helpers.error('any.custom', {
        message: 'Casa y Apartamento requieren minimo 2 comodidades seleccionadas.'
      });
    }
    return value;
  })
  .messages({
    'any.custom': '{{#message}}'
  })
  .unknown(true);

// Validación para actualizar inmueble
const actualizarInmuebleSchema = Joi.object({
  registro_inmobiliario: Joi.string()
    .min(5)
    .max(50)
    .pattern(/^[0-9A-Z\-]+$/)
    .optional()
    .messages({
      'string.min': 'El registro inmobiliario debe tener al menos 5 caracteres',
      'string.max': 'El registro inmobiliario no puede exceder 50 caracteres',
      'string.pattern.base': 'El registro inmobiliario solo puede contener números, letras mayúsculas y guiones'
    }),

  direccion: Joi.string()
    .min(10)
    .max(200)
    .optional()
    .messages({
      'string.min': 'La dirección debe tener al menos 10 caracteres',
      'string.max': 'La dirección no puede exceder 200 caracteres'
    }),

  barrio: Joi.string()
    .min(2)
    .max(100)
    .allow('', null)
    .optional(),

  ciudad: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'La ciudad debe tener al menos 2 caracteres',
      'string.max': 'La ciudad no puede exceder 100 caracteres'
    }),

    departamento: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'El departamento debe tener al menos 2 caracteres',
        'string.max': 'El departamento no puede exceder 100 caracteres'
      }),

    pais: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .messages({
        'string.min': 'El país debe tener al menos 2 caracteres',
        'string.max': 'El país no puede exceder 100 caracteres'
      }),

  categoria: Joi.string()
    .valid('Apartamento', 'Casa', 'Local', 'Oficina', 'Bodega', 'Lote', 'Finca', 'Otro')
    .optional()
    .messages({
      'any.only': 'Categoría inválida'
    }),

  precio_venta: Joi.number()
    .positive()
    .max(999999999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El precio de venta debe ser positivo',
      'number.max': 'El precio de venta es demasiado alto'
    }),

  precio_arriendo: Joi.number()
    .positive()
    .max(999999999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El precio de arriendo debe ser positivo',
      'number.max': 'El precio de arriendo es demasiado alto'
    }),

  area_construida: Joi.number()
    .positive()
    .max(999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El área construida debe ser positiva',
      'number.max': 'El área construida es demasiado grande'
    }),

  area_privada: Joi.number()
    .positive()
    .max(999999.99)
    .allow(null)
    .optional()
    .messages({
      'number.positive': 'El área privada debe ser positiva',
      'number.max': 'El área privada es demasiado grande'
    }),

  habitaciones: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'Las habitaciones no pueden ser negativas',
      'number.max': 'Demasiadas habitaciones'
    }),

  banos: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'Los baños no pueden ser negativos',
      'number.max': 'Demasiados baños'
    }),

  parqueaderos: Joi.number()
    .integer()
    .min(0)
    .max(20)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'Los parqueaderos no pueden ser negativos',
      'number.max': 'Demasiados parqueaderos'
    }),

  descripcion: Joi.string()
    .max(1000)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'La descripción no puede exceder 1000 caracteres'
    }),

  caracteristicas: Joi.array()
    .items(Joi.string().max(100))
    .max(50)
    .allow(null)
    .optional()
    .messages({
      'array.max': 'Demasiadas características'
    }),

  comodidades: Joi.array()
    .items(comodidadSchema)
    .max(50)
    .allow(null)
    .optional()
    .messages({
      'array.max': 'Demasiadas comodidades'
    }),

  imagenes: Joi.array()
    .items(Joi.string().uri())
    .max(20)
    .allow(null)
    .optional()
    .messages({
      'array.max': 'Demasiadas imágenes',
      'string.uri': 'URL de imagen inválida'
    }),

  propietario_id: Joi.number().integer().positive().optional(),
  propietario: propietarioSchema.optional(),

  estado: Joi.boolean()
    .optional(),

  destacado: Joi.boolean()
    .optional()
})
  .min(1)
  .messages({
    'object.min': 'Debe proporcionar al menos un campo para actualizar'
  })
  .unknown(true);

// Validación para buscar inmuebles
const buscarInmueblesSchema = Joi.object({
  ciudad: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  precio_min: Joi.number()
    .positive()
    .optional(),

  precio_max: Joi.number()
    .positive()
    .when('precio_min', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('precio_min'))
    })
    .optional()
    .messages({
      'number.greater': 'El precio máximo debe ser mayor al precio mínimo'
    }),

  area_min: Joi.number()
    .positive()
    .optional(),

  categoria: Joi.string()
    .valid('Apartamento', 'Casa', 'Local', 'Oficina', 'Bodega', 'Lote', 'Finca', 'Otro')
    .optional(),

  destacado: Joi.boolean()
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
    })
});

module.exports = {
  crearInmuebleSchema,
  actualizarInmuebleSchema,
  buscarInmueblesSchema
};
