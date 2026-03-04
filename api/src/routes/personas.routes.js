const express = require('express');
const router = express.Router();
const personasController = require('../controllers/personas.controller');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth.middleware');
const {
  crearPersonaSchema,
  actualizarPersonaSchema,
  buscarPersonaSchema
} = require('../validators/personas.validator');

// Aplicar autenticación a todas las rutas
router.use(auth.authenticateToken);

// Buscar personas por documento (accesible para todos los usuarios autenticados)
router.get('/buscar',
  validateQuery(buscarPersonaSchema),
  personasController.buscarPorDocumento
);

// Verificar si existe un correo electrónico (para validaciones en tiempo real)
router.get('/verificar-correo/:email',
  personasController.verificarCorreo
);

// Verificar si existe un número de documento (para validaciones en tiempo real)
router.get('/verificar-documento/:tipo/:numero',
  personasController.verificarDocumento
);

// Obtener perfil de la persona autenticada (solo el propio usuario)
router.get('/me',
  personasController.obtenerPerfil
);

// Obtener resumen propietario de la persona autenticada
router.get('/me/inmuebles',
  personasController.obtenerResumenPropietario
);

// Actualizar perfil de la persona autenticada (solo el propio usuario)
router.patch('/me',
  validate(actualizarPersonaSchema),
  personasController.actualizarPerfil
);

// Rutas administrativas (requieren permisos de admin)
router.use(auth.authorizeRoles(['Super Administrador', 'Administrador']));

// Listar personas con filtros (solo administradores)
router.get('/',
  personasController.listarPersonas
);

// Crear persona (solo administradores)
router.post('/',
  validate(crearPersonaSchema),
  personasController.crearPersona
);

// Cambiar estado de persona (solo administradores) - RUTA ESPECÍFICA PRIMERO
router.patch('/:id/estado',
  personasController.cambiarEstado
);

// Obtener persona por ID (solo administradores)
router.get('/:id',
  personasController.obtenerPorId
);

// Actualizar persona (solo administradores) - RUTA GENÉRICA AL FINAL
router.patch('/:id',
  validate(actualizarPersonaSchema),
  personasController.actualizarPersona
);

module.exports = router;
