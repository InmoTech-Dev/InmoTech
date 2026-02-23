const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { validate } = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth.middleware');
const {
  crearRolSchema,
  actualizarRolSchema
} = require('../validators/roles.validator');

// ========================================
// RUTAS PÚBLICAS CON AUTENTICACIÓN BÁSICA
// ========================================

// Listar roles (solo usuarios administrativos pueden ver roles)
router.get('/',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.listarRoles
);

// Obtener rol por ID (solo Super Admin y Admin)
router.get('/:id',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.obtenerRol
);

// ========================================
// RUTAS PROTEGIDAS: SUPER ADMIN Y ADMIN
// ========================================

// Crear rol (solo Super Admin y Admin)
router.post('/',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador']),
  validate(crearRolSchema),
  rolesController.crearRol
);

// Actualizar rol (solo Super Admin y Admin)
router.patch('/:id',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador']),
  validate(actualizarRolSchema),
  rolesController.actualizarRol
);

// ✅ CORREGIDO: Eliminar rol (solo Super Admin y Admin)
router.delete('/:id',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador']),
  rolesController.eliminarRol
);

// ========================================
// RUTAS DE ASIGNACIÓN DE ROLES
// ========================================

// Asignar rol a persona (Admin+)
router.post('/:idRol/asignar/:idPersona',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador']),
  rolesController.asignarRol
);

// Remover rol de persona (Admin+)
router.delete('/:idRol/remover/:idPersona',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador']),
  rolesController.removerRol
);

// Listar roles de una persona (Admin+)
router.get('/persona/:idPersona',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.listarRolesDePersona
);

// Listar personas con un rol específico (Admin+)
router.get('/:idRol/personas',
  auth.authenticateToken,
  auth.authorizeRoles(['Super Administrador', 'Administrador']),
  rolesController.listarPersonasPorRol
);

module.exports = router;
