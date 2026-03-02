const express = require('express');
const router = express.Router();
const renantsController = require('../controllers/renants.controller');
const { validate } = require('../middlewares/validate.middleware');
const { renantsLimiter, strictLimiter } = require('../middlewares/security.middleware');

const {
  createRenantSchema,
  updateRenantSchema,
  searchRenantsSchema
} = require('../validators/renants.validator');

// POST /api/v1/leases/renants - Crear arrendatario
router.post(
  '/',
  renantsLimiter,
  validate(createRenantSchema),
  renantsController.createRenant
);

// GET /api/v1/leases/renants - Obtener todos los arrendatarios
router.get('/', renantsController.getAllRenants);

// GET /api/v1/leases/renants/:id - Obtener arrendatario por ID
router.get('/:id', renantsController.getRenantById);

// PUT /api/v1/leases/renants/:id - Actualizar arrendatario
router.put(
  '/:id',
  strictLimiter,
  validate(updateRenantSchema),
  renantsController.updateRenant
);

// PATCH /api/v1/leases/renants/:id - Actualizar arrendatario (alternativa)
router.patch(
  '/:id',
  strictLimiter,
  validate(updateRenantSchema),
  renantsController.updateRenant
);

// DELETE /api/v1/leases/renants/:id - Eliminar arrendatario
router.delete('/:id', strictLimiter, renantsController.deleteRenant);

// PATCH /api/v1/leases/renants/:id/deactivate - Desactivar arrendatario
router.patch('/:id/deactivate', strictLimiter, renantsController.deactivateRenant);

// GET /api/v1/leases/renants/search/:criterio - Buscar arrendatarios
router.get(
  '/search/:criterio',
  validate(searchRenantsSchema),
  renantsController.searchRenants
);

module.exports = router;
