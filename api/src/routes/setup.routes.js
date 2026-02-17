const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setup.controller');
const { validate } = require('../middlewares/validate.middleware');
const { crearSuperAdminSchema } = require('../validators/setup.validator');

/**
 * @route POST /api/v1/setup/super-admin
 * @desc Crear super administrador inicial (solo puede usarse una vez)
 * @access Public (con clave secreta)
 */
router.post('/super-admin', validate(crearSuperAdminSchema), setupController.crearSuperAdmin);

module.exports = router;
