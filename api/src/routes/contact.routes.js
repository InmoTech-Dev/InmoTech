const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');

/**
 * @route POST /api/v1/contact
 * @desc Enviar un mensaje de contacto
 * @access Public
 */
router.post('/', contactController.enviarMensajeContacto);

module.exports = router;
