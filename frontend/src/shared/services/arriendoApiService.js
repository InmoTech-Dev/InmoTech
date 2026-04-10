/**
 * Servicio frontend para endpoints de arriendos (leases)
 */

import { apiClient } from './api.config';

const extractPagination = (response, fallback = {}) => {
  const payload =
    response && typeof response === 'object' && !Array.isArray(response)
      ? response
      : response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
        ? response.data
        : {};
  const pagination = payload?.pagination || payload?.paginacion || {};
  const page = fallback.page ?? 1;
  const limit = fallback.limit ?? 5;
  const total =
    pagination.total ??
    pagination.total_items ??
    pagination.totalItems ??
    pagination.count ??
    payload?.total ??
    payload?.total_items ??
    payload?.totalItems ??
    payload?.count ??
    0;
  const resolvedLimit = pagination.limite ?? pagination.limit ?? pagination.per_page ?? pagination.perPage ?? limit;
  const totalPagesRaw =
    pagination.paginas_totales ??
    pagination.total_paginas ??
    pagination.totalPages ??
    pagination.pages ??
    payload?.paginas_totales ??
    payload?.total_paginas ??
    payload?.totalPages ??
    payload?.pages;
  const resolvedTotalPages =
    totalPagesRaw ?? (total > 0 ? Math.ceil(total / Math.max(resolvedLimit || limit, 1)) : 1);

  return {
    total,
    pagina:
      pagination.pagina ??
      pagination.page ??
      pagination.current_page ??
      pagination.currentPage ??
      payload?.pagina ??
      payload?.page ??
      payload?.current_page ??
      payload?.currentPage ??
      page,
    limite: resolvedLimit,
    paginas_totales: resolvedTotalPages,
    has_next_page:
      pagination.has_next_page ??
      pagination.hasNextPage ??
      payload?.has_next_page ??
      payload?.hasNextPage ??
      false,
    has_prev_page:
      pagination.has_prev_page ??
      pagination.hasPrevPage ??
      payload?.has_prev_page ??
      payload?.hasPrevPage ??
      false,
  };
};

const extractList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

class ArriendoApiService {
  async crearArriendo(arriendoData) {
    const response = await apiClient.post('/leases', arriendoData);
    return response;
  }

  async obtenerArriendos(params = {}) {
    const response = await apiClient.get('/leases', { params });
    return {
      data: extractList(response),
      pagination: extractPagination(response, params),
      raw: response,
    };
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

  async registrarContrato(id, payload) {
    const response = await apiClient.patch(`/leases/${id}/contract`, payload);
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
