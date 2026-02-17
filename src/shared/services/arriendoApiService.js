/**
 * @fileoverview Servicio frontend para interactuar con el endpoint de Arriendos
 * @module shared/services/arriendoApiService
 * @description Cliente HTTP que consume la API REST de arriendos del backend
 * @author InmoTech Development Team
 * @version 1.0.0
 */

import { apiClient } from './api.config';

class ArriendoApiService {
  /**
   * Crea un nuevo arriendo
   * @param {Object} arriendoData - Datos del arriendo
   * @returns {Promise<Object>} Respuesta del servidor con el arriendo creado
   */
  async crearArriendo(arriendoData) {
    try {
      console.log('🏠 Creando nuevo arriendo...');

      const response = await apiClient.post('/leases', arriendoData);

      console.log('✅ Arriendo creado exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error creando arriendo:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene todos los arriendos con filtros opcionales
   * @param {Object} params - Parámetros de consulta (estado, etc.)
   * @returns {Promise<Object>} Lista de arriendos
   */
  async obtenerArriendos(params = {}) {
    try {
      console.log('📋 Obteniendo arriendos...');

      const response = await apiClient.get('/leases', { params });

      console.log('✅ Arriendos obtenidos');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo arriendos:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de arriendos
   * @returns {Promise<Object>} Estadísticas de arriendos
   */
  async obtenerEstadisticas() {
    try {
      console.log('📊 Obteniendo estadísticas de arriendos...');

      const response = await apiClient.get('/leases/dashboard/statistics');

      console.log('✅ Estadísticas obtenidas');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      throw error;
    }
  }

  /**
   * Reserva un arriendo
   * @param {number} id - ID del arriendo
   * @param {Object} reservaData - Datos de la reserva
   * @returns {Promise<Object>} Arriendo reservado
   */
  async reservarArriendo(id, reservaData) {
    try {
      console.log(`📅 Reservando arriendo con ID: ${id}`);

      const response = await apiClient.patch(`/leases/${id}/reservar`, reservaData);

      console.log('✅ Arriendo reservado');
      return response;
    } catch (error) {
      console.error('❌ Error reservando arriendo:', error.message);
      throw error;
    }
  }

  /**
   * Activa un arriendo
   * @param {number} id - ID del arriendo
   * @returns {Promise<Object>} Arriendo activado
   */
  async activarArriendo(id) {
    try {
      console.log(`▶️ Activando arriendo con ID: ${id}`);

      const response = await apiClient.patch(`/leases/${id}/activar`);

      console.log('✅ Arriendo activado');
      return response;
    } catch (error) {
      console.error('❌ Error activando arriendo:', error.message);
      throw error;
    }
  }

  /**
   * Finaliza un arriendo
   * @param {number} id - ID del arriendo
   * @returns {Promise<Object>} Arriendo finalizado
   */
  async finalizarArriendo(id) {
    try {
      console.log(`⏹️ Finalizando arriendo con ID: ${id}`);

      const response = await apiClient.patch(`/leases/${id}/finalizar`);

      console.log('✅ Arriendo finalizado');
      return response;
    } catch (error) {
      console.error('❌ Error finalizando arriendo:', error.message);
      throw error;
    }
  }
}

export default new ArriendoApiService();
