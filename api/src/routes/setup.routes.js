const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setup.controller');
const { validate } = require('../middlewares/validate.middleware');
const { setupLimiter } = require('../middlewares/security.middleware');
const { crearSuperAdminSchema } = require('../validators/setup.validator');

const requireSetupEnabled = (req, res, next) => {
  if (process.env.SETUP_ENABLE_ENDPOINT !== 'true') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint de setup no disponible'
    });
  }

  return next();
};

/**
 * @route POST /api/v1/setup/super-admin
 * @desc Crear super administrador inicial (solo puede usarse una vez)
 * @access Public (con clave secreta)
 */
router.post(
  '/super-admin',
  requireSetupEnabled,
  setupLimiter,
  validate(crearSuperAdminSchema),
  setupController.crearSuperAdmin
);

module.exports = router;
