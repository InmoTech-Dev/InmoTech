/**
 * Servicio de Server-Sent Events para notificaciones en tiempo real
 * Maneja conexiones SSE para notificaciones de seguridad de usuarios
 */

const logger = require('../utils/logger');
const opsConsoleLogger = require('../utils/opsConsoleLogger');
const { isAllowedOrigin } = require('../config/runtime');

const resolveSseOrigin = (requestOrigin) => {
  if (!requestOrigin) return null;
  if (isAllowedOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return null;
};

class SSEService {
  constructor() {
    this.clients = new Map(); // userId -> Set of response objects
    this.heartbeatInterval = null;
    this.startHeartbeat();
  }

  normalizeUserId(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  normalizeUserIds(values = []) {
    return Array.from(
      new Set(
        (Array.isArray(values) ? values : [values])
          .map((value) => this.normalizeUserId(value))
          .filter(Boolean)
      )
    );
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
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) {
      logger.warn('[SSE] Invalid user id when adding client', { userId });
      return;
    }

    if (!this.clients.has(normalizedUserId)) {
      this.clients.set(normalizedUserId, new Set());
    }

    const requestOrigin = res?.req?.headers?.origin;
    const acceptedOrigin = resolveSseOrigin(requestOrigin);

    // Configurar headers SSE
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Vary': 'Origin',
      'X-Accel-Buffering': 'no',
    };

    if (acceptedOrigin) {
      headers['Access-Control-Allow-Origin'] = acceptedOrigin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    res.writeHead(200, headers);

    // Agregar cliente
    this.clients.get(normalizedUserId).add(res);

    // Enviar mensaje de conexion
    this.sendToClient(res, 'connected', {
      message: 'Conexion SSE establecida',
      userId: normalizedUserId,
      timestamp: new Date().toISOString()
    });

    logger.info('[SSE] Client connected', { userId: normalizedUserId, totalClients: this.clients.size });
    opsConsoleLogger.info('SSE', 'CONNECT', 'OK', {
      user_id: normalizedUserId,
      active_users: this.clients.size,
      user_connections: this.clients.get(normalizedUserId).size,
    });

    // Manejar desconexion
    res.on('close', () => {
      this.removeClient(normalizedUserId, res);
    });

    res.on('error', (error) => {
      logger.error('[SSE] Error for user', { userId: normalizedUserId, error: error.message });
      this.removeClient(normalizedUserId, res);
    });
  }

  /**
   * Remueve una conexion SSE
   * @param {number} userId - ID del usuario
   * @param {Object} res - Objeto response a remover
   */
  removeClient(userId, res) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) return;

    if (this.clients.has(normalizedUserId)) {
      this.clients.get(normalizedUserId).delete(res);

      // Si no quedan clientes para este usuario, eliminar el set
      if (this.clients.get(normalizedUserId).size === 0) {
        this.clients.delete(normalizedUserId);
      }

      logger.info('[SSE] Client disconnected', { userId: normalizedUserId, remainingClients: this.clients.size });
      opsConsoleLogger.info('SSE', 'DISCONNECT', 'OK', {
        user_id: normalizedUserId,
        active_users: this.clients.size,
      });
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
      if (typeof res.flush === 'function') {
        res.flush();
      }
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
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) return;

    if (this.clients.has(normalizedUserId)) {
      const clients = this.clients.get(normalizedUserId);
      clients.forEach(res => {
        this.sendToClient(res, event, data);
      });

      logger.info('[SSE] Event sent to user', { userId: normalizedUserId, event, connections: clients.size });
    }
  }

  sendToUsers(userIds = [], event, data) {
    const normalizedUserIds = this.normalizeUserIds(userIds);
    if (normalizedUserIds.length === 0) return;

    normalizedUserIds.forEach((userId) => {
      this.sendToUser(userId, event, data);
    });
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
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) return;

    if (!this.clients.has(normalizedUserId) || this.clients.get(normalizedUserId).size === 0) {
      logger.warn('[SSE] Immediate logout requested but user has no active SSE connections', {
        userId: normalizedUserId,
        reason: data?.reason || 'session_revoked',
      });
      opsConsoleLogger.warn('SSE', 'FORCED_LOGOUT', 'NO_CLIENTS', {
        user_id: normalizedUserId,
        reason: data?.reason || 'session_revoked',
      });
      return;
    }

    const clients = this.clients.get(normalizedUserId);
    clients.forEach(res => {
      this.sendToClient(res, 'session.force_logout', {
        reason: data?.reason || 'user_disabled',
        message: data?.message || 'Tu sesion fue revocada',
        occurred_at: new Date().toISOString(),
      });
      this.sendToClient(res, 'user_disabled', data);
    });

    logger.warn('[SSE] Immediate logout sent', { userId: normalizedUserId, activeConnections: clients.size });
    opsConsoleLogger.warn('SSE', 'FORCED_LOGOUT', 'SENT', {
      user_id: normalizedUserId,
      active_connections: clients.size,
      reason: data?.reason || 'session_revoked',
    });

    // Close the connections after sending the logout
    setTimeout(() => {
      clients.forEach(res => {
        try {
          res.end();
        } catch (error) {
          // Ignore errors when closing
        }
      });
      this.clients.delete(normalizedUserId);
      logger.info('[SSE] Connections closed after forced logout', { userId: normalizedUserId });
      opsConsoleLogger.info('SSE', 'FORCED_LOGOUT', 'CLOSED', {
        user_id: normalizedUserId,
      });
    }, 100); // Small delay to ensure message is sent
  }

  /**
   * Notifica a un usuario que su cuenta ha sido deshabilitada
   * @param {number} userId - ID del usuario
   */
  notifyUserDisabled(userId) {
    this.sendImmediateLogout(userId, {
      reason: 'account_disabled',
      message: 'Tu cuenta esta deshabilitada. Comunicate con soporte o con un administrador.',
      action: 'logout',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notifica a un usuario que su contrasena ha sido cambiada
   * @param {number} userId - ID del usuario
   */
  notifyPasswordChanged(userId) {
    this.emitSessionForceLogout({
      userId,
      reason: 'password_changed',
      message: 'Tu contrasena ha sido cambiada por un administrador',
    });

    // Compatibilidad hacia clientes antiguos
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
    this.emitSessionForceLogout({
      userId,
      reason: 'admin_access_revoked',
      message: 'Tu acceso administrativo ha sido revocado',
    });

    // Compatibilidad hacia clientes antiguos
    this.sendToUser(userId, 'admin_access_revoked', {
      message: 'Tu acceso administrativo ha sido revocado',
      action: 'logout',
      timestamp: new Date().toISOString()
    });
  }

  emitSessionForceLogout({ userId, reason, message }) {
    const normalizedUserId = this.normalizeUserId(userId);
    if (!normalizedUserId) return;

    this.sendToUser(normalizedUserId, 'session.force_logout', {
      reason: reason || 'session_revoked',
      message: message || 'Tu sesion fue revocada',
      occurred_at: new Date().toISOString(),
    });
  }

  emitReportChanged({ action, reportId, affectedUserIds = [], audienceUserIds = [] }) {
    const recipients = this.normalizeUserIds([...affectedUserIds, ...audienceUserIds]);
    if (recipients.length === 0) return;

    this.sendToUsers(recipients, 'report.changed', {
      action: action || 'updated',
      report_id: this.normalizeUserId(reportId),
      affected_user_ids: this.normalizeUserIds(affectedUserIds),
      occurred_at: new Date().toISOString(),
    });
  }

  emitNotificationChanged({ userIds = [], scope = 'citas', unreadCountHint = null }) {
    const recipients = this.normalizeUserIds(userIds);
    if (recipients.length === 0) return;

    this.sendToUsers(recipients, 'notification.changed', {
      scope,
      unread_count_hint:
        typeof unreadCountHint === 'number' && Number.isFinite(unreadCountHint)
          ? unreadCountHint
          : null,
      occurred_at: new Date().toISOString(),
    });
  }

  emitUserChanged({ action, userId, affectedUserIds = [], audienceUserIds = [] }) {
    const recipients = this.normalizeUserIds([...affectedUserIds, ...audienceUserIds]);
    if (recipients.length === 0) return;

    this.sendToUsers(recipients, 'user.changed', {
      action: action || 'updated',
      user_id: this.normalizeUserId(userId),
      affected_user_ids: this.normalizeUserIds(affectedUserIds),
      occurred_at: new Date().toISOString(),
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
