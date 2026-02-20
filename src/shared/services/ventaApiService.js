import { apiClient } from './api.config';

const extractList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

export const ventaApiService = {
  async obtenerVentas(params = {}) {
    const response = await apiClient.get('/sales', params);
    const data = extractList(response);
    return { data };
  },

  async obtenerVenta(id) {
    return apiClient.get(`/sales/${id}`);
  },

  async obtenerCatalogoEstados() {
    return apiClient.get('/sales/statuses/catalog');
  },

  async actualizarVenta(id, payload) {
    return apiClient.patch(`/sales/${id}`, payload);
  },

  async cambiarEstado(id, payload) {
    try {
      return await apiClient.patch(`/sales/${id}/status`, payload);
    } catch (error) {
      // Compatibilidad: si la ruta no existe en el backend actual, usar el endpoint antiguo de tracking
      if (error.status === 404) {
        return apiClient.post(`/sales/${id}/tracking`, payload);
      }
      throw error;
    }
  },

  async agregarTracking(id, payload) {
    // Ruta antigua; se mantiene por compatibilidad pero la lógica nueva usa cambiarEstado
    return apiClient.post(`/sales/${id}/tracking`, payload);
  },

  async crearVenta(payload) {
    return apiClient.post('/sales', payload);
  },
};

export default ventaApiService;
