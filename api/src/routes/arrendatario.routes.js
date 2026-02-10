const express = require('express');
const router = express.Router();
const arrendatarioController = require('../controllers/arrendatarioController');

// Gestión de Arrendatarios
router.get('/', arrendatarioController.obtenerArrendatarios);
router.get('/activos', arrendatarioController.obtenerArrendatariosActivos);
router.get('/:id', arrendatarioController.obtenerArrendatarioPorId);
router.get('/:id/arriendos', arrendatarioController.obtenerArriendosPorArrendatario);
router.post('/:id/historial', arrendatarioController.agregarHistorialArrendatario);
router.get('/:id/historial', arrendatarioController.obtenerHistorialArrendatario);

module.exports = router;