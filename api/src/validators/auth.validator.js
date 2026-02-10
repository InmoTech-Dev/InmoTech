const Joi = require('joi');

// Validación para registro de usuario
const registroSchema = Joi.object({
  tipo_documento: Joi.string()
    .valid('CC', 'CE', 'TI', 'PAS', 'NIT')
    .required()
    .messages({
      'any.only': 'Tipo de documento inválido',
      'any.required': 'El tipo de documento es obligatorio'
    }),

  numero_documento: Joi.string()
    .min(5)
    .max(20)
    .pattern(/^[a-zA-Z0-9]+$/)
    .required()
    .messages({
      'string.min': 'El número de documento debe tener al menos 5 caracteres',
      'string.max': 'El número de documento no puede exceder 20 caracteres',
      'string.pattern.base': 'El número de documento solo puede contener letras y números',
      'any.required': 'El número de documento es obligatorio'
    }),

  nombre_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .required()
    .messages({
      'string.min': 'El nombre completo debe tener al menos 2 caracteres',
      'string.max': 'El nombre completo no puede exceder 100 caracteres',
      'string.pattern.base': 'El nombre completo solo puede contener letras y espacios',
      'any.required': 'El nombre completo es obligatorio'
    }),

  apellido_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .required()
    .messages({
      'string.min': 'El apellido completo debe tener al menos 2 caracteres',
      'string.max': 'El apellido completo no puede exceder 100 caracteres',
      'string.pattern.base': 'El apellido completo solo puede contener letras y espacios',
      'any.required': 'El apellido completo es obligatorio'
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
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
    .pattern(/^[0-9\s\+\-]+$/)
    .required()
    .messages({
      'string.min': 'El teléfono debe tener al menos 10 caracteres',
      'string.max': 'El teléfono no puede exceder 20 caracteres',
      'string.pattern.base': 'El teléfono solo puede contener números, espacios, + y -',
      'any.required': 'El teléfono es obligatorio'
    }),

  // ✅ REGEX CORREGIDO - Ahora SÍ permite todos los caracteres especiales
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.max': 'La contraseña no puede exceder 100 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial (@$!%*?&#)',
      'any.required': 'La contraseña es obligatoria'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'La confirmación de contraseña es obligatoria'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'El formato del email es inválido',
      'any.required': 'El email es obligatorio'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es obligatoria'
    })
});

const cambiarContrasenaSchema = Joi.object({
  contrasena_actual: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña actual es obligatoria'
    }),

  contrasena_nueva: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.max': 'La nueva contraseña no puede exceder 100 caracteres',
      'string.pattern.base': 'La nueva contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial',
      'any.required': 'La nueva contraseña es obligatoria'
    }),

  confirmar_contrasena: Joi.string()
    .valid(Joi.ref('contrasena_nueva'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'La confirmación de la nueva contraseña es obligatoria'
    })
});

const actualizarPerfilSchema = Joi.object({
  nombre_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .optional(),

  apellido_completo: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .optional(),

  telefono: Joi.string()
    .min(10)
    .max(20)
    .pattern(/^[0-9\s\+\-]+$/)
    .optional()
    .messages({
      'string.min': 'El teléfono debe tener al menos 10 caracteres',
      'string.max': 'El teléfono no puede exceder 20 caracteres',
      'string.pattern.base': 'El teléfono solo puede contener números, espacios, + y -'
    }),

  foto_perfil_url: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'La URL de la imagen no es válida'
    }),

  foto_public_id: Joi.string()
    .max(255)
    .optional()
})
  .min(1)
  .messages({
    'object.min': 'Debe proporcionar al menos un campo para actualizar'
  });

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'El token de refresco es obligatorio'
    })
});

const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'El token es obligatorio'
    })
});

const verifyCodeSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'El formato del email es invǭlido',
      'any.required': 'El email es obligatorio'
    }),
  codigo: Joi.string()
    .length(6)
    .required()
    .messages({
      'string.length': 'El codigo debe tener 6 digitos',
      'any.required': 'El codigo es obligatorio'
    })
});

const resendCodeSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'El formato del email es invǭlido',
      'any.required': 'El email es obligatorio'
    })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'El formato del email es inválido',
      'any.required': 'El email es obligatorio'
    })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': 'El token de recuperacion no es valido',
      'any.required': 'El token de recuperacion es obligatorio'
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#.])[A-Za-z\d@$!%*?&#.]+$/)
    .required()
    .messages({
      'string.min': 'La contrasena debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contrasena debe contener al menos una minuscula, una mayuscula, un numero y un caracter especial',
      'any.required': 'La contrasena es obligatoria'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Las contrasenas no coinciden',
      'any.required': 'La confirmacion de contrasena es obligatoria'
    })
});


const resetPasswordTokenSchema = Joi.object({
  token: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': 'El token de recuperacion no es valido',
      'any.required': 'El token de recuperacion es obligatorio'
    })
});

module.exports = {
  registroSchema,
  loginSchema,
  cambiarContrasenaSchema,
  actualizarPerfilSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  verifyCodeSchema,
  resendCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordTokenSchema
};
