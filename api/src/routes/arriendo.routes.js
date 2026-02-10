const express = require('express');
const router = express.Router();
const arriendoController = require('../controllers/arriendo.controller');

router.post('/', arriendoController.crearArriendo);
router.get('/', arriendoController.obtenerArriendos);
router.get('/estadisticas', arriendoController.obtenerEstadisticas);
router.patch('/:id/reservar', arriendoController.reservarArriendo);
router.patch('/:id/activar', arriendoController.activarArriendo);
router.patch('/:id/finalizar', arriendoController.finalizarArriendo);

module.exports = router;