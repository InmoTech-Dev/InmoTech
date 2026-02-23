/**
 * Rutas para Server-Sent Events (SSE)
 * Proporciona endpoints para conexiones SSE en tiempo real
 */

const express = require('express');
const router = express.Router();
const sseService = require('../services/sse.service');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { sseConnectLimiter } = require('../middlewares/security.middleware');
const logger = require('../utils/logger');

  /**
   * GET /api/v1/sse/connect
   * Establece una conexion SSE para el usuario autenticado usando cookies httpOnly
   */
router.get('/connect', sseConnectLimiter, authenticateToken, async (req, res) => {
  try {
    logger.info('[SSE] Connection initiated from httpOnly cookies', { userId: req.user.id, email: req.user.email });

    // El middleware authenticateToken ya valida las cookies y proporciona req.user
    const userId = req.user.id;

    logger.info('[SSE] Connection accepted', { userId, email: req.user.email });

    // Establecer conexion SSE
    sseService.addClient(userId, res);

  } catch (error) {
    logger.error('[SSE] Error in SSE connection', { error: error.message, userId: req.user?.id });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
});

/**
 * GET /api/v1/sse/stats
 * Obtiene estadisticas de conexiones SSE (solo para administradores)
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    // Verificar permisos de administrador
    const esAdmin = req.user.roles && (
      req.user.roles.includes('Super Administrador') ||
      req.user.roles.includes('Administrador')
    );

    if (!esAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Se requieren permisos administrativos'
      });
    }

    const stats = sseService.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error obteniendo estadisticas SSE:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
