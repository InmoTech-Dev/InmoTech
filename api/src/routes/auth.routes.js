const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate, validateQuery } = require('../middlewares/validate.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware');
const {
  loginLimiter,
  forgotPasswordLimiter,
  authMeLimiter,
} = require('../middlewares/security.middleware');
const { validateAuthOrigin } = require('../middlewares/origin.middleware');
const {
  loginSchema,
  cambiarContrasenaSchema,
  actualizarPerfilSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordTokenSchema,
} = require('../validators/auth.validator');

// Rutas publicas
router.post('/login', loginLimiter, validate(loginSchema), authController.iniciarSesion);
router.post('/refresh', validateAuthOrigin, validate(refreshTokenSchema), authController.refrescarToken);
router.post('/logout', validateAuthOrigin, authController.cerrarSesion);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.solicitarRecuperacionContrasena);
router.get('/reset-password', validateQuery(resetPasswordTokenSchema), authController.validarTokenRecuperacion);
router.post('/reset-password', validate(resetPasswordSchema), authController.restablecerContrasena);

// Rutas protegidas
router.use(authenticateToken);
router.get('/me', authMeLimiter, authController.obtenerPerfil);
router.patch('/me', validate(actualizarPerfilSchema), authController.actualizarPerfil);
router.patch('/change-password', validate(cambiarContrasenaSchema), authController.cambiarContrasena);
router.get('/password-last-changed', authController.obtenerUltimoCambioPassword);

module.exports = router;
