import { apiClient } from './api.config';

class AdministrativosApiService {
  constructor() {
    // Usar apiClient en lugar de axios directamente
  }

  /**
   * Obtener lista de administrativos con paginación
   * @param {Object} params - Parámetros de consulta
   * @returns {Promise<Object>} Lista de administrativos
   */
  async getAdministrativos(params = {}) {
    try {
      return await apiClient.get('/administrativos', { params });
    } catch (error) {
      console.error('Error obteniendo administrativos:', error);
      throw error;
    }
  }

  /**
   * Obtener un administrativo por ID
   * @param {number} id - ID del administrativo
   * @returns {Promise<Object>} Datos del administrativo
   */
  async getAdministrativoById(id) {
    try {
      return await apiClient.get(`/administrativos/${id}`);
    } catch (error) {
      console.error('Error obteniendo administrativo:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo administrativo
   * @param {Object} administrativoData - Datos del administrativo
   * @returns {Promise<Object>} Administrativo creado
   */
  async createAdministrativo(administrativoData) {
    try {
      return await apiClient.post('/administrativos', administrativoData);
    } catch (error) {
      console.error('Error creando administrativo:', error);
      throw error;
    }
  }

  /**
   * Actualizar un administrativo
   * @param {number} id - ID del administrativo
   * @param {Object} administrativoData - Datos a actualizar
   * @returns {Promise<Object>} Administrativo actualizado
   */
  async updateAdministrativo(id, administrativoData) {
    try {
      return await apiClient.put(`/administrativos/${id}`, administrativoData);
    } catch (error) {
      console.error('Error actualizando administrativo:', error);
      throw error;
    }
  }

  /**
   * Cambiar estado laboral de un administrativo
   * @param {number} id - ID del administrativo
   * @param {Object} estadoData - Datos del cambio de estado
   * @returns {Promise<Object>} Resultado de la operación
   */
  async cambiarEstadoAdministrativo(id, estadoData) {
    try {
      return await apiClient.patch(`/administrativos/${id}/estado`, estadoData);
    } catch (error) {
      console.error('Error cambiando estado del administrativo:', error);
      throw error;
    }
  }

  /**
   * Eliminar un administrativo (desactivación lógica)
   * @param {number} id - ID del administrativo
   * @returns {Promise<Object>} Resultado de la operación
   */
  async deleteAdministrativo(id) {
    try {
      return await apiClient.delete(`/administrativos/${id}`);
    } catch (error) {
      console.error('Error eliminando administrativo:', error);
      throw error;
    }
  }

  /**
   * Mapear estado laboral a ID para UI
   * @param {string} estado - Estado laboral
   * @returns {number} ID del estado
   */
  mapEstadoToId(estado) {
    const estadoMap = {
      'Activo': 1,
      'Inactivo': 2,
      'Suspendido': 3,
      'Retirado': 4
    };
    return estadoMap[estado] || 1;
  }

  /**
   * Mapear ID de estado a estado laboral
   * @param {number} idEstado - ID del estado
   * @returns {string} Estado laboral
   */
  mapIdToEstado(idEstado) {
    const idEstadoMap = {
      1: 'Activo',
      2: 'Inactivo',
      3: 'Suspendido',
      4: 'Retirado'
    };
    return idEstadoMap[idEstado] || 'Activo';
  }

  /**
   * Formatear fecha para display
   * @param {string} fechaString - Fecha en formato string
   * @returns {string} Fecha formateada
   */
  formatFecha(fechaString) {
    if (!fechaString) return '-';

    try {
      const date = new Date(fechaString);
      if (isNaN(date.getTime())) return fechaString;

      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return fechaString;
    }
  }
}

export default new AdministrativosApiService();
