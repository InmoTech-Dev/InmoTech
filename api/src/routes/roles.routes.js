const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { validate } = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth.middleware');
const {
  crearRolSchema,
  actualizarRolSchema
} = require('../validators/roles.validator');

// Aplicar rate limiting menos estricto para operaciones de lectura
const { generalLimiter } = require('../middlewares/security.middleware');

// ========================================
// RUTAS PÚBLICAS CON AUTENTICACIÓN BÁSICA
// ========================================

// Listar roles (solo usuarios administrativos pueden ver roles)
router.get('/',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.listarRoles
);

// Obtener rol por ID (todos los usuarios autenticados)
router.get('/:id',
  generalLimiter,
  auth.authenticateToken,
  rolesController.obtenerRol
);

// ========================================
// RUTAS PROTEGIDAS: SUPER ADMIN Y ADMIN
// ========================================

// Crear rol (solo Super Admin y Admin)
router.post('/',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  validate(crearRolSchema),
  rolesController.crearRol
);

// Actualizar rol (solo Super Admin y Admin)
router.patch('/:id',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  validate(actualizarRolSchema),
  rolesController.actualizarRol
);

// ✅ CORREGIDO: Eliminar rol (solo Super Admin y Admin)
router.delete('/:id',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.eliminarRol
);

// ========================================
// RUTAS DE ASIGNACIÓN DE ROLES
// ========================================

// Asignar rol a persona (Admin+)
router.post('/:idRol/asignar/:idPersona',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.asignarRol
);

// Remover rol de persona (Admin+)
router.delete('/:idRol/remover/:idPersona',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.removerRol
);

// Listar roles de una persona (Admin+)
router.get('/persona/:idPersona',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.listarRolesDePersona
);

// Listar personas con un rol específico (Admin+)
router.get('/:idRol/personas',
  generalLimiter,
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.listarPersonasPorRol
);

module.exports = router;
