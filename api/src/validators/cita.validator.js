const Joi = require('joi');
const {
  calculateEndTime,
  isBusinessDay,
  isValidAppointmentStart,
} = require('../constants/appointmentSchedule');

// Función custom para validar que la fecha no sea anterior a HOY
const isTodayOrFuture = (value, helpers) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const citaDate = new Date(`${value}T00:00:00`);
  citaDate.setHours(0, 0, 0, 0);

  if (citaDate < today) {
    return helpers.error('date.min');
  }

  return value;
};

const isBusinessDate = (value, helpers) => {
  if (!isBusinessDay(value)) {
    return helpers.error('date.businessDay');
  }

  return value;
};

const isValidStartTime = (value, helpers) => {
  if (!isValidAppointmentStart(value)) {
    return helpers.error('time.invalidStart');
  }

  return value;
};

const validateAppointmentSchedule = (value, helpers) => {
  const fecha = value.fecha_cita;
  const horaInicio = value.hora_inicio;
  const horaFin = value.hora_fin;

  if (!fecha || !horaInicio || !horaFin) {
    return value;
  }

  if (!isBusinessDay(fecha)) {
    return helpers.error('date.businessDay');
  }

  if (!isValidAppointmentStart(horaInicio)) {
    return helpers.error('time.invalidStart', { value: horaInicio });
  }

  const expectedEnd = calculateEndTime(horaInicio);
  if (!expectedEnd || horaFin !== expectedEnd) {
    return helpers.error('time.invalidRange', { expectedEnd });
  }

  return value;
};

// ✅ VALIDACIÓN SIMPLIFICADA - Solo nombre y apellido
const crearCitaSchema = Joi.object({
  // Identificación
  tipo_documento: Joi.string()
    .valid('CC', 'CE', 'NIT', 'Pasaporte', 'TI', 'PAS')
    .required()
    .messages({
      'any.required': 'El tipo de documento es obligatorio',
      'any.only': 'Tipo de documento inválido'
    }),

  numero_documento: Joi.string()
    .min(5)
    .max(20)
    .pattern(/^[A-Za-z0-9\s.-]+$/)
    .required()
    .messages({
      'string.min': 'El número de documento debe tener al menos 5 caracteres',
      'string.max': 'El número de documento no puede exceder 20 caracteres',
      'string.pattern.base': 'El número de documento solo puede contener letras, números, espacios, puntos y guiones',
      'any.required': 'El número de documento es obligatorio'
    }),

  // ✅ SIMPLIFICADO: Solo nombre y apellido completos
  nombre_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .required()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'any.required': 'El nombre completo es obligatorio'
    }),

  apellido_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .required()
    .messages({
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede exceder 100 caracteres',
      'string.pattern.base': 'El apellido solo puede contener letras y espacios',
      'any.required': 'El apellido completo es obligatorio'
    }),

  // ✅ CORREGIDO: email en lugar de correo
  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.email': 'El formato del email es inválido',
      'string.max': 'El email no puede exceder 100 caracteres',
      'any.required': 'El email es obligatorio'
    }),

  telefono: Joi.string()
    .min(10)
    .max(20)
    .pattern(/^(\+?57\s?)?[3][0-9]{2}\s?[0-9]{3}\s?[0-9]{4}$/)
    .required()
    .messages({
      'string.min': 'El teléfono debe tener al menos 10 dígitos',
      'string.max': 'El teléfono no puede exceder 20 caracteres',
      'string.pattern.base': 'El teléfono debe ser un número colombiano válido',
      'any.required': 'El teléfono es obligatorio'
    }),

  id_inmueble: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional()
    .messages({
      'number.base': 'El inmueble debe ser un número o null',
      'number.positive': 'El inmueble debe ser un número positivo'
    }),

  id_servicio: Joi.number()
    .integer()
    .positive()
    .required(),

  fecha_cita: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom(isTodayOrFuture)
    .custom(isBusinessDate)
    .required()
    .messages({
      'string.pattern.base': 'El formato de fecha debe ser YYYY-MM-DD',
      'date.min': 'La fecha de la cita no puede ser anterior a hoy',
      'date.businessDay': 'Las citas solo se pueden agendar de lunes a viernes',
      'any.required': 'La fecha de la cita es obligatoria'
    }),

  hora_inicio: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .custom(isValidStartTime)
    .required(),

  hora_fin: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required(),

  observaciones: Joi.string()
    .max(1000)
    .allow('', null)
    .optional(),

  id_estado_cita: Joi.number()
    .integer()
    .valid(1, 2, 3, 4, 5, 6)
    .optional()
    .default(1)
})
  .custom(validateAppointmentSchedule)
  .messages({
    'time.invalidStart': 'Las citas solo permiten horas en punto dentro del horario laboral',
    'time.invalidRange': 'La hora de fin debe ser exactamente una hora despues de la hora de inicio',
    'date.businessDay': 'Las citas solo se pueden agendar de lunes a viernes'
  });

const actualizarCitaSchema = Joi.object({
  id_estado_cita: Joi.number()
    .integer()
    .valid(1, 2, 3, 4, 5, 6)
    .optional(),

  fecha_cita: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom(isTodayOrFuture)
    .custom(isBusinessDate)
    .optional(),

  hora_inicio: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .custom(isValidStartTime)
    .optional(),

  hora_fin: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),

  observaciones: Joi.string()
    .max(1000)
    .allow('', null)
    .optional(),

  motivo_cancelacion: Joi.string()
    .max(500)
    .allow('', null)
    .optional(),

  id_agente_asignado: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional()
})
  .min(1)
  .unknown(true)
  .custom(validateAppointmentSchedule)
  .messages({
    'time.invalidStart': 'Las citas solo permiten horas en punto dentro del horario laboral',
    'time.invalidRange': 'La hora de fin debe ser exactamente una hora despues de la hora de inicio',
    'date.businessDay': 'Las citas solo se pueden agendar de lunes a viernes'
  });

const confirmarCitaSchema = Joi.object({
  id_agente_asignado: Joi.number()
    .integer()
    .positive()
    .required()
});

const cancelarCitaSchema = Joi.object({
  motivo_cancelacion: Joi.string()
    .min(10)
    .max(500)
    .required()
});

const reagendarCitaSchema = Joi.object({
  fecha_cita: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value, helpers) => {
      // Validar que la fecha sea válida y no anterior a HOY
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const citaDate = new Date(`${value}T00:00:00`);
      citaDate.setHours(0, 0, 0, 0);

      if (citaDate < today) {
        return helpers.error('date.min');
      }

      return value;
    })
    .custom(isBusinessDate)
    .required()
    .messages({
      'date.min': 'La fecha de la cita no puede ser anterior a hoy',
      'string.pattern.base': 'El formato de fecha debe ser YYYY-MM-DD',
      'date.businessDay': 'Las citas solo se pueden agendar de lunes a viernes'
    }),

  hora_inicio: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .custom(isValidStartTime)
    .required(),

  hora_fin: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required(),

  motivo_reagendamiento: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'El motivo de reagendamiento debe tener al menos 10 caracteres',
      'string.max': 'El motivo de reagendamiento no puede exceder 500 caracteres',
      'any.required': 'El motivo de reagendamiento es obligatorio'
    }),

  id_agente_asignado: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional(),

  id_servicio: Joi.number()
    .integer()
    .positive()
    .optional(),

  observaciones: Joi.string()
    .max(1000)
    .allow('', null)
    .optional()
})
  .custom(validateAppointmentSchedule)
  .messages({
    'time.invalidStart': 'Las citas solo permiten horas en punto dentro del horario laboral',
    'time.invalidRange': 'La hora de fin debe ser exactamente una hora despues de la hora de inicio',
    'date.businessDay': 'Las citas solo se pueden agendar de lunes a viernes'
  });

const buscarPersonaSchema = Joi.object({
  tipo_documento: Joi.string()
    .valid('CC', 'CE', 'NIT', 'Pasaporte', 'TI', 'PAS')
    .required(),

  numero_documento: Joi.string()
    .required()
});

module.exports = {
  crearCitaSchema,
  actualizarCitaSchema,
  confirmarCitaSchema,
  cancelarCitaSchema,
  reagendarCitaSchema,
  buscarPersonaSchema
};
