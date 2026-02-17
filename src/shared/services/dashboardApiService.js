/**
 * Servicio para consumir la API de estadísticas del dashboard
 */

import { apiClient } from './api.config';

class DashboardApiService {
  /**
   * Obtener estadísticas del dashboard
   * @returns {Promise<Object>} Estadísticas del dashboard
   */
  async getDashboardStats({ range } = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (range) {
        queryParams.append('range', range);
      }

      const endpoint = queryParams.toString()
        ? `/reportes/dashboard-stats?${queryParams.toString()}`
        : '/reportes/dashboard-stats';

      const response = await apiClient.get(endpoint);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Error obteniendo estadísticas del dashboard');
      }
    } catch (error) {
      console.error('Error en getDashboardStats:', error);
      throw error;
    }
  }
}

export default new DashboardApiService();
