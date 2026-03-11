const router = require('express').Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const { uploadLimiter } = require('../middlewares/security.middleware');
const { uploadSingleAny, subirImagen } = require('../controllers/upload.controller');

// Solo usuarios autenticados pueden subir su imagen o archivos
router.post('/upload', authenticateToken, uploadLimiter, uploadSingleAny, subirImagen);

module.exports = router;
