import { apiClient } from './api.config';
import { mapInmuebleFromApi } from './propertyApidervice';

const extractPayload = (response) => response?.data?.data ?? response?.data ?? response;

const normalizeCatalogItem = (item = {}) => {
  const normalized = mapInmuebleFromApi(item);
  const labelParts = [
    normalized.titulo || normalized.categoria || normalized.tipo,
    normalized.registro ? `(${normalized.registro})` : null,
    normalized.ciudad || normalized.departamento || null,
  ].filter(Boolean);

  return {
    ...normalized, // Ensure imagen, imagenes, titulo, etc. are at the top level
    id: normalized.id,
    registro: normalized.registro || normalized.registro_inmobiliario,
    label: labelParts.join(' '),
    raw: normalized,
  };
};

export const propertiesApiService = {
  async getAll(params = {}) {
    const response = await apiClient.get('/inmuebles', params);
    const data = extractPayload(response);

    const list = Array.isArray(data?.inmuebles)
      ? data.inmuebles
      : Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

    return list.map(normalizeCatalogItem);
  },

  async getById(id) {
    const response = await apiClient.get(`/inmuebles/${id}`);
    return normalizeCatalogItem(extractPayload(response));
  },
};

export default propertiesApiService;
