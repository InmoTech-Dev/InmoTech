import { apiClient } from './api.config';
import { getApiBaseUrl } from '../config/runtime';

const extractList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

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

export const ventaApiService = {
  async obtenerVentas(params = {}) {
    const response = await apiClient.get('/sales', { params });
    const data = extractList(response);
    return { data, pagination: extractPagination(response, params) };
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

  async subirAdjunto(idVenta, file, tipo) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    // Ayudas para el backend/Cloudinary: folder organizado y tipo correcto
    formData.append('folder', `inmotech/ventas/${idVenta}`);
    if (file && file.type) formData.append('content_type', file.type);
    if (file && /\.pdf$/i.test(file.name)) {
      formData.append('resource_type', 'raw');
      formData.append('type', 'upload'); // asegurar público
    } else {
      // imágenes u otros: dejar auto
      formData.append('resource_type', 'auto');
      formData.append('type', 'upload');
    }
    // No enviar cabecera headers anidada; fetch infiere multipart con FormData
    return apiClient.post(`/sales/${idVenta}/attachments`, formData);
  },

  async listarAdjuntos(idVenta) {
    return apiClient.get(`/sales/${idVenta}/attachments`);
  },

  getAttachmentFileUrl(idVenta, adjuntoId, { download = false } = {}) {
    const baseUrl = getApiBaseUrl();
    const suffix = download ? '?download=1' : '';
    return `${baseUrl}/sales/${idVenta}/attachments/${adjuntoId}/file${suffix}`;
  },

  async fetchAttachmentBlob(idVenta, adjuntoId) {
    const response = await fetch(this.getAttachmentFileUrl(idVenta, adjuntoId), {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`No se pudo obtener el adjunto. Código ${response.status}.`);
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || blob.type || '';

    if (contentType.toLowerCase().includes('pdf') || !contentType) {
      return new Blob([blob], { type: 'application/pdf' });
    }

    return blob;
  },
};

export default ventaApiService;
