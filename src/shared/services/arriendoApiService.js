/**
 * Servicio frontend para endpoints de arriendos (leases)
 */

import { apiClient } from './api.config';

class ArriendoApiService {
  async crearArriendo(arriendoData) {
    const response = await apiClient.post('/leases', arriendoData);
    return response;
  }

  async obtenerArriendos(params = {}) {
    const response = await apiClient.get('/leases', { params });
    return response;
  }

  async obtenerEstadisticas() {
    const response = await apiClient.get('/leases/dashboard/statistics');
    return response;
  }

  async reservarArriendo(id, reservaData) {
    const response = await apiClient.patch(`/leases/${id}/reservar`, reservaData);
    return response;
  }

  async activarArriendo(id) {
    const response = await apiClient.patch(`/leases/${id}/activar`);
    return response;
  }

  async finalizarArriendo(id) {
    const response = await apiClient.patch(`/leases/${id}/finalizar`);
    return response;
  }

  async eliminarArriendo(id) {
    const response = await apiClient.delete(`/leases/${id}`);
    return response;
  }

  async actualizarEstado(id, payload) {
    const response = await apiClient.patch(`/leases/${id}/estado`, payload);
    return response;
  }

  async prorrogarArriendo(id, payload) {
    const response = await apiClient.patch(`/leases/${id}/extend`, payload);
    return response;
  }

  async reajustarCanon(id, payload) {
    const response = await apiClient.patch(`/leases/${id}/adjust-rent`, payload);
    return response;
  }

  async registrarPreaviso(id, payload) {
    const response = await apiClient.patch(`/leases/${id}/pre-notice`, payload);
    return response;
  }

  async eliminarPreaviso(id) {
    const response = await apiClient.delete(`/leases/${id}/pre-notice`);
    return response;
  }

  // Cobros del arriendo
  async obtenerCobros(id) {
    const response = await apiClient.get(`/leases/${id}/payments`);
    return response;
  }

  // Comprobante de pago asociado a un cobro
  async crearComprobante(leaseId, paymentId, payload) {
    const response = await apiClient.post(
      `/leases/${leaseId}/payments/${paymentId}/receipt`,
      payload
    );
    return response;
  }
}

export default new ArriendoApiService();
