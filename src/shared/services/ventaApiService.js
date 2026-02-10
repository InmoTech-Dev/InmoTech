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

  async actualizarVenta(id, payload) {
    return apiClient.patch(`/sales/${id}`, payload);
  },

  async agregarTracking(id, payload) {
    console.log("se camibio estado");
    return apiClient.post(`/sales/${id}/tracking`, payload);
  },

  async crearVenta(payload) {
    return apiClient.post('/sales', payload);
  },
};

export default ventaApiService;
