const express = require('express');
const router = express.Router();
const inmueblesController = require('../controllers/inmuebles.controller');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth.middleware');
const {
  crearInmuebleSchema,
  actualizarInmuebleSchema,
  buscarInmueblesSchema
} = require('../validators/inmuebles.validator');

// ========================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================
router.get('/buscar',
  validateQuery(buscarInmueblesSchema),
  inmueblesController.buscarInmuebles
);

const { authenticateToken, authorizePermissions } = auth;

// After public routes, apply authentication to the rest
router.use(authenticateToken);

// Obtener inmueble por ID (requires 'ver' permission)
router.get('/:id',
  authorizePermissions('inmuebles', 'ver'),
  inmueblesController.obtenerInmueble
);

// Obtener disponibilidad horaria de un inmueble (requires 'ver' permission)
router.get('/:id/disponibilidad',
  authorizePermissions('inmuebles', 'ver'),
  inmueblesController.obtenerDisponibilidad
);

// Listar inmuebles con filtros (requires 'ver' permission)
router.get('/',
  authorizePermissions('inmuebles', 'ver'),
  inmueblesController.listarInmuebles
);

// Crear inmueble (requires 'crear' permission)
router.post('/',
  authorizePermissions('inmuebles', 'crear'),
  validate(crearInmuebleSchema),
  inmueblesController.crearInmueble
);

// Actualizar inmueble (requires 'editar' permission)
router.patch('/:id',
  authorizePermissions('inmuebles', 'editar'),
  validate(actualizarInmuebleSchema),
  inmueblesController.actualizarInmueble
);

// Eliminar inmueble (requires 'eliminar' permission)
router.delete('/:id',
  authorizePermissions('inmuebles', 'eliminar'),
  inmueblesController.eliminarInmueble
);

module.exports = router;
