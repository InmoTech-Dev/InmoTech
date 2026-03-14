import { apiClient } from './api.config';

const DEFAULT_LIMIT = 100;
const OWNER_ROLE = 'Propietario';

const cleanText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const sanitizeDocument = (value) => {
  if (!value) return '';
  return value.toString().toUpperCase().replace(/[^0-9A-Z]/g, '');
};

const normalizePagination = (pagination = {}, fallbackPage = 1, fallbackLimit = DEFAULT_LIMIT) => ({
  pagina: pagination.pagina ?? pagination.page ?? fallbackPage,
  limite: pagination.limite ?? pagination.limit ?? fallbackLimit,
  paginas_totales: pagination.paginas_totales ?? pagination.totalPages ?? 1,
  total: pagination.total ?? pagination.count ?? 0
});

const extractData = (response) => response?.data?.data || response?.data || response;

export const normalizeOwnerResponse = (record = {}) => {
  const nombres = cleanText(record.nombre_completo ?? record.nombres, cleanText(record.primer_nombre, ''));
  const apellidos = cleanText(record.apellido_completo ?? record.apellidos, cleanText(record.primer_apellido, ''));
  const nombreCompleto = [nombres, apellidos].filter(Boolean).join(' ').trim() || 'Sin nombre';

  const idPersona = record.id_persona ?? record.id;

  return {
    id: idPersona,
    tipoDocumento: record.tipo_documento || record.tipoDocumento || 'CC',
    numeroDocumento: record.numero_documento || record.numeroDocumento || '',
    nombres: nombres || nombreCompleto,
    apellidos,
    nombreCompleto,
    documento: [record.tipo_documento || record.tipoDocumento, record.numero_documento || record.numeroDocumento]
      .filter(Boolean)
      .join(' '),
    email: cleanText(record.correo || record.email, ''),
    telefono: cleanText(record.telefono, ''),
    ciudad: cleanText(record.ciudad, 'Sin ciudad'),
    direccion: cleanText(record.direccion, 'Sin dirección'),
    estado: record.estado === false ? 'Inactivo' : 'Activo',
    tieneCuenta: Boolean(record.tiene_cuenta),
    fechaRegistro: record.fecha_registro || record.fechaRegistro,
    roles: record.roles || [],
    registro: record.registro || `PROP-${new Date().getFullYear()}-${String(idPersona ?? 0).padStart(3, '0')}`,
    inmuebles: record.inmuebles || [],
    cantidadInmuebles: record.cantidadInmuebles ?? (record.inmuebles ? record.inmuebles.length : 0)
  };
};

const mapCreatePayload = (owner = {}) => {
  const documentValue = sanitizeDocument(owner.numeroDocumento || owner.numero_documento);

  const pickText = (...keys) => {
    for (const key of keys) {
      const normalized = cleanText(owner[key], '');
      if (normalized) return normalized;
    }
    return '';
  };

  const primerNombre = pickText('primer_nombre', 'primerNombre');
  const segundoNombre = pickText('segundo_nombre', 'segundoNombre');
  const primerApellido = pickText('primer_apellido', 'primerApellido');
  const segundoApellido = pickText('segundo_apellido', 'segundoApellido');

  const composedNames = [primerNombre, segundoNombre].filter(Boolean).join(' ').trim();
  const composedLastNames = [primerApellido, segundoApellido].filter(Boolean).join(' ').trim();

  const nombresFinales = composedNames || pickText('nombre_completo', 'nombreCompleto', 'nombres') || 'Sin nombre';
  const apellidosFinales = composedLastNames || pickText('apellido_completo', 'apellidos') || 'Sin apellido';

  const payload = {
    tipo_documento: owner.tipoDocumento || owner.tipo_documento,
    numero_documento: documentValue || `TEMP${Date.now()}`,
    nombre_completo: nombresFinales,
    apellido_completo: apellidosFinales,
    primer_nombre: primerNombre || null,
    segundo_nombre: segundoNombre || null,
    primer_apellido: primerApellido || null,
    segundo_apellido: segundoApellido || null,
    correo: cleanText(owner.email || owner.correo, '') || null,
    telefono: cleanText(owner.telefono, '') || null,
    estado: owner.estado === 'Inactivo' ? false : true,
    tiene_cuenta: owner.tieneCuenta ?? false,
    rol: OWNER_ROLE
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

const mapUpdatePayload = (owner = {}) => {
  const payload = {
    nombre_completo: cleanText(owner.nombres || owner.nombre_completo, owner.nombreCompleto),
    apellido_completo: cleanText(owner.apellidos || owner.apellido_completo, ''),
    correo: cleanText(owner.email || owner.correo, '') || null,
    telefono: cleanText(owner.telefono, '') || null,
    estado: owner.estado === 'Inactivo' ? false : true
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

class OwnersApiService {
  constructor() {
    this.defaultLimit = DEFAULT_LIMIT;
  }

  filterOwners(owners = []) {
    const normalized = owners || [];

    const onlyOwners = normalized.filter((owner) => {
      const hasOwnerRole = owner.roles?.some((role) =>
        cleanText(role?.nombre_rol, '').toLowerCase().includes('propiet')
      );

      // Consider owners without roles (creados desde formulario) as valid as well
      const isNewOwner = !owner.roles || owner.roles.length === 0;

      return hasOwnerRole || isNewOwner;
    });

    return onlyOwners.length ? onlyOwners : normalized;
  }

  async getOwners({ page = 1, limit = this.defaultLimit } = {}) {
    try {
      const response = await apiClient.get('/personas', {
        pagina: page,
        limite: limit,
        estado: true,
        rol: OWNER_ROLE
      });

      const payload = response?.data || {};
      const personas = Array.isArray(payload.personas) ? payload.personas : [];
      const normalized = personas.map(normalizeOwnerResponse);

      return {
        owners: this.filterOwners(normalized),
        pagination: normalizePagination(payload.paginacion, page, limit)
      };
    } catch (error) {
      console.error('❌ Error obteniendo propietarios:', error);
      throw error;
    }
  }

  async createOwner(data) {
    const response = await apiClient.post('/personas', mapCreatePayload(data));
    return normalizeOwnerResponse(extractData(response));
  }

  async updateOwner(id, data) {
    const response = await apiClient.patch(`/personas/${id}`, mapUpdatePayload(data));
    return normalizeOwnerResponse(extractData(response));
  }
}

const ownersApiService = new OwnersApiService();

export default ownersApiService;
