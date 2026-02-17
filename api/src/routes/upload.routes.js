const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const { uploadSingle, subirImagen } = require('../controllers/upload.controller');

// Solo usuarios autenticados pueden subir su imagen
router.post('/upload', authenticateToken, uploadSingle, subirImagen);

module.exports = router;
