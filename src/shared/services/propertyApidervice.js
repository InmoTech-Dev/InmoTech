import { apiClient } from './api.config';

const DEFAULT_COUNTRY = 'Colombia';
const DEFAULT_LIMIT = 50;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildTitle = (inmueble = {}) => {
  if (inmueble.titulo) return inmueble.titulo;
  if (inmueble.nombre_comercial) return inmueble.nombre_comercial;

  const categoria = inmueble.categoria || 'Inmueble';
  const ciudad = inmueble.ciudad || inmueble.departamento || '';

  return `${categoria}${ciudad ? ` en ${ciudad}` : ''}`;
};

const cleanText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeEstadoValue = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  const truthyValues = ['1', 'true', 'disponible', 'activo'];
  const falsyValues = ['0', 'false', 'no disponible', 'inactivo'];

  if (truthyValues.includes(normalized)) return true;
  if (falsyValues.includes(normalized)) return false;

  return undefined;
};

const normalizeAmenity = (amenity, index = 0) => {
  if (!amenity) return null;

  if (typeof amenity === 'string') {
    const nombre = amenity;
    return {
      id: `${nombre.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      nombre,
      cantidad: 1,
      seleccionada: true,
      custom: true
    };
  }

  const nombre = cleanText(amenity.nombre || amenity.label, `Comodidad ${index + 1}`);

  return {
    id: amenity.id || `${nombre.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    nombre,
    cantidad: toNumber(amenity.cantidad) ?? 1,
    seleccionada: amenity.seleccionada ?? true,
    custom: amenity.custom ?? false
  };
};

const normalizeAmenities = (amenities = []) =>
  amenities
    .map((amenity, index) => normalizeAmenity(amenity, index))
    .filter(Boolean);

const extractImageSource = (item) => {
  if (!item) return '';
  if (typeof item === 'string') {
    return cleanText(item, '');
  }

  if (typeof item === 'object') {
    const candidates = [
      item.url,
      item.src,
      item.source,
      item.link,
      item.path,
      item.fileUrl,
      item.imagen_url,
      item.imagenUrl,
      item.image,
      item.foto,
      item.foto_url
    ];

    const matched = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return cleanText(matched, '');
  }

  return '';
};

const normalizeImageList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [value];
    } catch (_error) {
      return [value];
    }
  }

  return [value];
};

const sanitizeImages = (imagenes = []) =>
  normalizeImageList(imagenes)
    .map((entry) => extractImageSource(entry))
    .filter((src) => src.length > 0);

const formatOwnerFromApi = (owner = {}) => {
  const fallbackNameParts = [
    owner.primer_nombre,
    owner.segundo_nombre,
    owner.primer_apellido,
    owner.segundo_apellido
  ].filter(Boolean);

  const nombre = cleanText(owner.nombre_completo, fallbackNameParts.join(' ').trim());
  const apellido = cleanText(owner.apellido_completo, owner.primer_apellido || '');

  return {
    id: owner.id_persona ?? owner.id,
    nombreCompleto: nombre || 'Sin nombre',
    apellidos: apellido,
    email: cleanText(owner.correo, 'Sin correo'),
    telefono: cleanText(owner.telefono, 'Sin teléfono')
  };
};

export const mapInmuebleFromApi = (inmueble = {}) => {
  const propietariosRaw = Array.isArray(inmueble.propietarios) ? inmueble.propietarios : [];
  const propietarios = propietariosRaw.map(formatOwnerFromApi);
  const ownerIds = propietarios.map((owner) => owner.id).filter(Boolean);

  const precioVenta = toNumber(inmueble.precio_venta ?? inmueble.precioVenta);
  const precioArriendo = toNumber(inmueble.precio_arriendo ?? inmueble.precioArriendo);
  const estadoFrontendRaw =
    inmueble.estado_frontend ?? inmueble.estadoFrontEnd ?? inmueble.estado ?? inmueble.estado_bool;
  const estadoBool = normalizeEstadoValue(estadoFrontendRaw);
  const estadoTexto =
    typeof estadoFrontendRaw === 'boolean'
      ? estadoFrontendRaw
        ? 'Disponible'
        : 'No disponible'
      : cleanText(estadoFrontendRaw, 'Disponible');
  const rawAmenities = inmueble.comodidades || inmueble.caracteristicas || [];
  const comodidades = normalizeAmenities(rawAmenities);
  let imagenes = sanitizeImages(
    inmueble.imagenes ||
      inmueble.metadata?.raw?.imagenes ||
      inmueble.imagenes_json ||
      inmueble.imagenesRaw ||
      []
  );
  if (!imagenes.length) {
    imagenes = sanitizeImages([
      inmueble.imagen_principal,
      inmueble.imagen_portada,
      inmueble.portada,
      inmueble.imagen_destacada
    ]);
  }

  let operacion = inmueble.operacion || 'Sin definir';
  if (operacion === 'Sin definir') {
    if (precioArriendo && precioVenta) {
      operacion = 'Venta y Arriendo';
    } else if (precioArriendo) {
      operacion = 'Arriendo';
    } else if (precioVenta) {
      operacion = 'Venta';
    }
  }

  return {
    id: inmueble.id_inmueble ?? inmueble.id,
    registro: inmueble.registro_inmobiliario ?? inmueble.registro,
    image: imagenes[0] || '',
    titulo: inmueble.titulo || buildTitle(inmueble),
    direccion: inmueble.direccion,
    barrio: inmueble.barrio,
    ciudad: inmueble.ciudad,
    departamento: inmueble.departamento,
    pais: inmueble.pais,
    tipo: inmueble.categoria || inmueble.tipo || 'Sin categoría',
    categoria: inmueble.categoria || inmueble.tipo || 'Sin categoría',
    operacion,
    estado: estadoTexto,
    estado_bool: estadoBool ?? true,
    descripcion: inmueble.descripcion,
    precio: precioVenta ?? precioArriendo ?? 0,
    precio_venta: precioVenta,
    precio_arriendo: precioArriendo,
    propietario: propietarios[0] || null,
    propietarios,
    ownerIds,
    comodidades,
    fichasTecnicas: inmueble.fichas_tecnicas || inmueble.fichasTecnicas || [],
    imagenes,
    area_construida:
      toNumber(inmueble.area_construida ?? inmueble.areaConstruida ?? inmueble.area) ?? null,
    area_privada: toNumber(inmueble.area_privada ?? inmueble.areaPrivada) ?? null,
    estado_frontend: estadoTexto,
    metadata: {
      raw: inmueble
    }
  };
};

const normalizePagination = (pagination = {}, fallbackPage = 1, fallbackLimit = DEFAULT_LIMIT) => ({
  pagina: pagination.pagina ?? pagination.page ?? fallbackPage,
  limite: pagination.limite ?? pagination.limit ?? fallbackLimit,
  paginas_totales: pagination.paginas_totales ?? pagination.totalPages ?? 1,
  total: pagination.total ?? pagination.count ?? 0
});

const mapInmuebleToApi = (payload = {}) => {
  const isVenta = payload.operacion === 'Venta' || payload.operacion === 'Venta y Arriendo';
  const isArriendo = payload.operacion === 'Arriendo' || payload.operacion === 'Venta y Arriendo';
  const normalizedEstadoBool = normalizeEstadoValue(
    payload.estado ?? payload.estado_bool ?? payload.estadoBool ?? payload.estado_frontend
  );
  const estadoFrontendTexto =
    typeof payload.estado === 'string'
      ? payload.estado
      : payload.estado_frontend ?? payload.estado_texto ?? payload.estadoTexto;
  const sanitizedImages =
    payload.imagenes === undefined ? undefined : sanitizeImages(payload.imagenes || []);

  const body = {
    registro_inmobiliario: payload.registro_inmobiliario || payload.registro,
    titulo: payload.titulo,
    direccion: payload.direccion,
    barrio: payload.barrio ?? null,
    ciudad: payload.ciudad,
    departamento: payload.departamento,
    pais: payload.pais || DEFAULT_COUNTRY,
    categoria: payload.categoria || payload.tipo || 'Otro',
    operacion: payload.operacion,
    estado: normalizedEstadoBool,
    estado_frontend: estadoFrontendTexto,
    precio_venta: isVenta ? toNumber(payload.precio_venta ?? payload.precioVenta ?? payload.precio) : null,
    precio_arriendo: isArriendo ? toNumber(payload.precio_arriendo ?? payload.precioArriendo ?? payload.precio) : null,
    area_construida: toNumber(payload.area_construida ?? payload.areaConstruida),
    area_privada: toNumber(payload.area_privada ?? payload.areaPrivada),
    descripcion: payload.descripcion ?? payload.descripcion_detallada ?? '',
    comodidades: payload.comodidades || [],
    imagenes: sanitizedImages
  };

  if (payload.propietarioId) {
    body.propietario_id = payload.propietarioId;
  }

  if (payload.propietario) {
    body.propietario = payload.propietario;
  }

  Object.keys(body).forEach((key) => {
    if (body[key] === undefined) {
      delete body[key];
    }
  });

  return body;
};

const extractPayload = (response) => response?.data?.data || response?.data || response;

export const inmueblesAPI = {
  async getInmuebles(page = 1, limit = DEFAULT_LIMIT, filters = {}) {
    try {
      const response = await apiClient.get('/inmuebles', {
        page,
        limit,
        ...filters
      });

      const payload = response?.data || response || {};
      const items = Array.isArray(payload.inmuebles)
        ? payload.inmuebles.map(mapInmuebleFromApi)
        : [];

      return {
        items,
        pagination: normalizePagination(payload.paginacion, page, limit)
      };
    } catch (error) {
      console.error('Error en getInmuebles:', error);
      throw error;
    }
  },

  // Versión pública (landing) - usa /inmuebles/buscar sin auth
  async getPublicInmuebles(page = 1, limit = DEFAULT_LIMIT, filters = {}) {
    try {
      const response = await apiClient.get('/inmuebles/buscar', {
        pagina: page,
        limite: limit,
        ...filters,
        _t: Date.now()
      });

      const payload = response?.data || response || {};
      const items = Array.isArray(payload.inmuebles)
        ? payload.inmuebles.map(mapInmuebleFromApi)
        : [];

      return {
        items,
        pagination: normalizePagination(payload.paginacion, page, limit)
      };
    } catch (error) {
      console.error('Error en getPublicInmuebles:', error);
      throw error;
    }
  },

  async getInmuebleById(id) {
    try {
      const response = await apiClient.get(`/inmuebles/${id}`);
      return mapInmuebleFromApi(extractPayload(response));
    } catch (error) {
      console.error('Error en getInmuebleById:', error);
      throw error;
    }
  },

  async getInmuebleByRegistro(registro) {
    try {
      const clean = (registro || '').trim();
      if (!clean) return null;

      const response = await apiClient.get('/inmuebles', {
        registro: clean,
        registro_inmobiliario: clean,
        busqueda: clean,
        page: 1,
        limit: 5,
      });

      const payload = response?.data || response || {};
      const items = Array.isArray(payload.inmuebles)
        ? payload.inmuebles.map(mapInmuebleFromApi)
        : Array.isArray(payload.data)
        ? payload.data.map(mapInmuebleFromApi)
        : [];

      return items[0] || null;
    } catch (error) {
      console.error('Error en getInmuebleByRegistro:', error);
      throw error;
    }
  },

  async createInmueble(inmuebleData) {
    try {
      const response = await apiClient.post('/inmuebles', mapInmuebleToApi(inmuebleData));
      return mapInmuebleFromApi(extractPayload(response));
    } catch (error) {
      console.error('Error en createInmueble:', error);
      throw error;
    }
  },

  async updateInmueble(id, inmuebleData) {
    try {
      const response = await apiClient.patch(`/inmuebles/${id}`, mapInmuebleToApi(inmuebleData));
      return mapInmuebleFromApi(extractPayload(response));
    } catch (error) {
      console.error('Error en updateInmueble:', error);
      throw error;
    }
  },

  async deleteInmueble(id) {
    try {
      await apiClient.delete(`/inmuebles/${id}`);
      return true;
    } catch (error) {
      console.error('Error en deleteInmueble:', error);
      throw error;
    }
  }
};

export { formatOwnerFromApi };
