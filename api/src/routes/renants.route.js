const express = require('express');
const router = express.Router();
const renantsController = require('../controllers/renants.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter } = require('../middlewares/security.middleware');
const { authenticateToken, authorizePermissions } = require('../middlewares/auth.middleware');

const {
  createRenantSchema,
  updateRenantSchema,
  searchRenantsSchema
} = require('../validators/renants.validator');

router.use(authenticateToken);

// POST /api/v1/leases/renants - Crear arrendatario
router.post(
  '/',
  authorizePermissions('arriendos', 'crear'),
  createLimiter,
  validate(createRenantSchema),
  renantsController.createRenant
);

// GET /api/v1/leases/renants - Obtener todos los arrendatarios
router.get(
  '/',
  authorizePermissions('arriendos', 'ver'),
  renantsController.getAllRenants
);

// GET /api/v1/leases/renants/:id - Obtener arrendatario por ID
router.get(
  '/:id',
  authorizePermissions('arriendos', 'ver'),
  renantsController.getRenantById
);

// PUT /api/v1/leases/renants/:id - Actualizar arrendatario
router.put(
  '/:id',
  authorizePermissions('arriendos', 'editar'),
  strictLimiter,
  validate(updateRenantSchema),
  renantsController.updateRenant
);

// PATCH /api/v1/leases/renants/:id - Actualizar arrendatario (alternativa)
router.patch(
  '/:id',
  authorizePermissions('arriendos', 'editar'),
  strictLimiter,
  validate(updateRenantSchema),
  renantsController.updateRenant
);

// DELETE /api/v1/leases/renants/:id - Eliminar arrendatario
router.delete(
  '/:id',
  authorizePermissions('arriendos', 'eliminar'),
  strictLimiter,
  renantsController.deleteRenant
);

// PATCH /api/v1/leases/renants/:id/deactivate - Desactivar arrendatario
router.patch(
  '/:id/deactivate',
  authorizePermissions('arriendos', 'eliminar'),
  strictLimiter,
  renantsController.deactivateRenant
);

// GET /api/v1/leases/renants/search/:criterio - Buscar arrendatarios
router.get(
  '/search/:criterio',
  authorizePermissions('arriendos', 'ver'),
  validate(searchRenantsSchema),
  renantsController.searchRenants
);

module.exports = router;
