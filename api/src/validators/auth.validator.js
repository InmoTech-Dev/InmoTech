const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'El formato del email es invalido',
      'any.required': 'El email es obligatorio'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contrasena es obligatoria'
    })
});

const cambiarContrasenaSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'La contrasena actual es obligatoria'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/)
    .required()
    .messages({
      'string.min': 'La nueva contrasena debe tener al menos 8 caracteres',
      'string.max': 'La nueva contrasena no puede exceder 100 caracteres',
      'string.pattern.base': 'La nueva contrasena debe contener al menos una minuscula, una mayuscula, un numero y un caracter especial',
      'any.required': 'La nueva contrasena es obligatoria'
    }),

  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Las contrasenas no coinciden',
      'any.required': 'La confirmacion de la nueva contrasena es obligatoria'
    })
})
  .rename('contrasena_actual', 'currentPassword', { ignoreUndefined: true, override: true })
  .rename('contrasena_nueva', 'newPassword', { ignoreUndefined: true, override: true })
  .rename('confirmar_contrasena', 'confirmNewPassword', { ignoreUndefined: true, override: true });

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
      'string.min': 'El telefono debe tener al menos 10 caracteres',
      'string.max': 'El telefono no puede exceder 20 caracteres',
      'string.pattern.base': 'El telefono solo puede contener numeros, espacios, + y -'
    }),

  foto_perfil_url: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'La URL de la imagen no es valida'
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
    .optional()
    .messages({
      'string.base': 'El token de refresco debe ser texto'
    })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'El formato del email es invalido',
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
  loginSchema,
  cambiarContrasenaSchema,
  actualizarPerfilSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordTokenSchema
};
