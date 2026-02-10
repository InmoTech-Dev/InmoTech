/**
 * Servicio de Server-Sent Events para notificaciones en tiempo real
 * Maneja conexiones SSE para notificaciones de seguridad de usuarios
 */

const logger = require('../utils/logger');

class SSEService {
  constructor() {
    this.clients = new Map(); // userId -> Set of response objects
    this.heartbeatInterval = null;
    this.startHeartbeat();
  }

  /**
   * Inicia el envio de heartbeats para mantener conexiones vivas
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcastToAll('heartbeat', { timestamp: new Date().toISOString() });
    }, 30000); // 30 segundos
  }

  /**
   * Agrega una nueva conexion SSE para un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} res - Objeto response de Express
   */
  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }

    // Configurar headers SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Agregar cliente
    this.clients.get(userId).add(res);

    // Enviar mensaje de conexion
    this.sendToClient(res, 'connected', {
      message: 'Conexion SSE establecida',
      userId,
      timestamp: new Date().toISOString()
    });

    logger.info('[SSE] Client connected', { userId, totalClients: this.clients.size });

    // Manejar desconexion
    res.on('close', () => {
      this.removeClient(userId, res);
    });

    res.on('error', (error) => {
      logger.error('[SSE] Error for user', { userId, error: error.message });
      this.removeClient(userId, res);
    });
  }

  /**
   * Remueve una conexion SSE
   * @param {number} userId - ID del usuario
   * @param {Object} res - Objeto response a remover
   */
  removeClient(userId, res) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(res);

      // Si no quedan clientes para este usuario, eliminar el set
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }

      logger.info('[SSE] Client disconnected', { userId, remainingClients: this.clients.size });
    }
  }

  /**
   * Envia un evento a un cliente especifico
   * @param {Object} res - Objeto response del cliente
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos del evento
   */
  sendToClient(res, event, data) {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(message);
    } catch (error) {
      logger.error('[SSE] Error sending message', { event, error: error.message });
    }
  }

  /**
   * Envia un evento a todos los clientes de un usuario especifico
   * @param {number} userId - ID del usuario
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos del evento
   */
  sendToUser(userId, event, data) {
    if (this.clients.has(userId)) {
      const clients = this.clients.get(userId);
      clients.forEach(res => {
        this.sendToClient(res, event, data);
      });

      logger.info('[SSE] Event sent to user', { userId, event, connections: clients.size });
    }
  }

  /**
   * Envia un evento a todos los clientes conectados
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos del evento
   */
  broadcastToAll(event, data) {
    let totalClients = 0;
    for (const [userId, clients] of this.clients) {
      clients.forEach(res => {
        this.sendToClient(res, event, data);
        totalClients++;
      });
    }

    if (event !== 'heartbeat') {
      logger.info('[SSE] Event broadcast', { event, totalClients });
    }
  }

  /**
   * Send immediate logout notification to active SSE connection (for reconnections)
   * @param {number} userId - ID of the user
   * @param {Object} data - Logout data
   */
  sendImmediateLogout(userId, data) {
    if (this.clients.has(userId)) {
      const clients = this.clients.get(userId);
      clients.forEach(res => {
        this.sendToClient(res, 'user_disabled', data);
      });

      logger.warn('[SSE] Immediate logout sent', { userId, activeConnections: clients.size });

      // Close the connections after sending the logout
      setTimeout(() => {
        clients.forEach(res => {
          try {
            res.end();
          } catch (error) {
            // Ignore errors when closing
          }
        });
        this.clients.delete(userId);
        logger.info('[SSE] Connections closed after forced logout', { userId });
      }, 100); // Small delay to ensure message is sent
    }
  }

  /**
   * Notifica a un usuario que su cuenta ha sido deshabilitada
   * @param {number} userId - ID del usuario
   */
  notifyUserDisabled(userId) {
    this.sendToUser(userId, 'user_disabled', {
      message: 'Tu cuenta ha sido deshabilitada por un administrador',
      action: 'logout',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notifica a un usuario que su contrasena ha sido cambiada
   * @param {number} userId - ID del usuario
   */
  notifyPasswordChanged(userId) {
    this.sendToUser(userId, 'password_changed', {
      message: 'Tu contrasena ha sido cambiada por un administrador',
      action: 'logout',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notifica a un usuario que su acceso administrativo ha sido revocado
   * @param {number} userId - ID del usuario
   */
  notifyAdminAccessRevoked(userId) {
    this.sendToUser(userId, 'admin_access_revoked', {
      message: 'Tu acceso administrativo ha sido revocado',
      action: 'logout',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtiene estadisticas de conexiones SSE
   */
  getStats() {
    let totalConnections = 0;
    const userStats = {};

    for (const [userId, clients] of this.clients) {
      const count = clients.size;
      totalConnections += count;
      userStats[userId] = count;
    }

    return {
      totalUsers: this.clients.size,
      totalConnections,
      users: userStats
    };
  }

  /**
   * Cierra todas las conexiones y limpia recursos
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const [userId, clients] of this.clients) {
      clients.forEach(res => {
        try {
          res.end();
        } catch (error) {
          // Ignorar errores al cerrar
        }
      });
    }

    this.clients.clear();
    logger.info('[SSE] Service shut down successfully');
  }
}

module.exports = new SSEService();
