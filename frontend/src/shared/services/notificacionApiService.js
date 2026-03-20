/**
 * Servicio frontend para notificaciones del backend
 */

import { apiClient } from './api.config.js';

class NotificacionApiService {
  async obtenerNoLeidas() {
    try {
      const response = await apiClient.get('/notificaciones');
      return response;
    } catch (error) {
      console.error('[NOTIF] Error obteniendo no leidas:', error.message);
      throw error;
    }
  }

  async marcarVariasComoLeidas(ids = []) {
    const sanitizedIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((id) => Number.parseInt(id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );

    if (sanitizedIds.length === 0) {
      return {
        success: true,
        message: 'No hay IDs para marcar como leidas',
        data: { total_actualizadas: 0 }
      };
    }

    try {
      const response = await apiClient.post('/notificaciones/leer-multiples', {
        ids: sanitizedIds
      });
      return response;
    } catch (error) {
      console.error('[NOTIF] Error marcando varias como leidas:', error.message);
      throw error;
    }
  }
}

export default new NotificacionApiService();
