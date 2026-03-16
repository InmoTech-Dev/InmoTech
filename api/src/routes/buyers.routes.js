const express = require('express');
const router = express.Router();
const buyersController = require('../controllers/buyers.controller');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const { createLimiter, strictLimiter } = require('../middlewares/security.middleware');

const {
  createBuyerSchema,
  updateBuyerSchema,
  searchBuyersSchema
} = require('../validators/buyers.validator');

// POST /api/v1/sales/buyers - Crear comprador
router.post(
  '/',
  createLimiter,
  validate(createBuyerSchema),
  buyersController.createBuyer
);

// GET /api/v1/sales/buyers - Obtener todos los compradores
router.get('/', buyersController.getAllBuyers);

// GET /api/v1/sales/buyers/:id - Obtener comprador por ID
router.get('/:id', buyersController.getBuyerById);

// PUT /api/v1/sales/buyers/:id - Actualizar comprador
router.put(
  '/:id',
  strictLimiter,
  validate(updateBuyerSchema),
  buyersController.updateBuyer
);

// PATCH /api/v1/sales/buyers/:id - Actualizar comprador (alternativa)
router.patch(
  '/:id',
  strictLimiter,
  validate(updateBuyerSchema),
  buyersController.updateBuyer
);

// DELETE /api/v1/sales/buyers/:id - Eliminar comprador definitivamente
router.delete('/:id', strictLimiter, buyersController.deleteBuyer);

// PATCH /api/v1/sales/buyers/:id/deactivate - Desactivar comprador
router.patch('/:id/deactivate', strictLimiter, buyersController.deactivateBuyer);

// GET /api/v1/sales/buyers/search/:criterio - Buscar compradores
router.get(
  '/search/:criterio',
  validateQuery(searchBuyersSchema),
  buyersController.searchBuyers
);

module.exports = router;
