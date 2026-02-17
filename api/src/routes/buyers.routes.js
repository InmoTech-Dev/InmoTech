const express = require('express');
const router = express.Router();
const buyersController = require('../controllers/buyers.controller');
const { validate } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter } = require('../middlewares/security.middleware');
const { authenticateToken, authorizePermissions } = require('../middlewares/auth.middleware');

const {
  createBuyerSchema,
  updateBuyerSchema,
  searchBuyersSchema
} = require('../validators/buyers.validator');

router.use(authenticateToken);

// POST /api/v1/sales/buyers - Crear comprador
router.post(
  '/',
  authorizePermissions('ventas', 'crear'),
  createLimiter,
  validate(createBuyerSchema),
  buyersController.createBuyer
);

// GET /api/v1/sales/buyers - Obtener todos los compradores
router.get(
  '/',
  authorizePermissions('ventas', 'ver'),
  buyersController.getAllBuyers
);

// GET /api/v1/sales/buyers/:id - Obtener comprador por ID
router.get(
  '/:id',
  authorizePermissions('ventas', 'ver'),
  buyersController.getBuyerById
);

// PUT /api/v1/sales/buyers/:id - Actualizar comprador
router.put(
  '/:id',
  authorizePermissions('ventas', 'editar'),
  strictLimiter,
  validate(updateBuyerSchema),
  buyersController.updateBuyer
);

// PATCH /api/v1/sales/buyers/:id - Actualizar comprador (alternativa)
router.patch(
  '/:id',
  authorizePermissions('ventas', 'editar'),
  strictLimiter,
  validate(updateBuyerSchema),
  buyersController.updateBuyer
);

// DELETE /api/v1/sales/buyers/:id - Eliminar comprador definitivamente
router.delete(
  '/:id',
  authorizePermissions('ventas', 'eliminar'),
  strictLimiter,
  buyersController.deleteBuyer
);

// PATCH /api/v1/sales/buyers/:id/deactivate - Desactivar comprador
router.patch(
  '/:id/deactivate',
  authorizePermissions('ventas', 'eliminar'),
  strictLimiter,
  buyersController.deactivateBuyer
);

// GET /api/v1/sales/buyers/search/:criterio - Buscar compradores
router.get(
  '/search/:criterio',
  authorizePermissions('ventas', 'ver'),
  validate(searchBuyersSchema),
  buyersController.searchBuyers
);

module.exports = router;
