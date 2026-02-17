// routes/compradorRoutes.js
const express = require('express');
const router = express.Router();
const compradorController = require('../controllers/compradorController');

// Gestión de Compradores
router.get('/', compradorController.obtenerCompradores);
router.post('/', compradorController.crearComprador);
router.get('/potenciales', compradorController.obtenerCompradoresPotenciales);
router.get('/:id', compradorController.obtenerCompradorPorId);
router.put('/:id', compradorController.actualizarComprador);
router.delete('/:id', compradorController.eliminarComprador);
router.put('/:id/asignar-compra', compradorController.asignarCompra);

module.exports = router;