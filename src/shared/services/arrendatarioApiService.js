import { apiClient } from './api.config';

const extractList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const splitNames = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [first = '', second = ''] = parts;
  return { first, rest: parts.slice(1).join(' ') || second || '' };
};

const mapRenantFromApi = (record = {}) => {
  const persona = record.persona || record.Persona || record;
  const renant = record.renant || record;

  const { first: primerNombre, rest: segundoNombre } = splitNames(
    persona.nombre_completo || persona.nombres || ''
  );
  const { first: primerApellido, rest: segundoApellido } = splitNames(
    persona.apellido_completo || persona.apellidos || ''
  );

  const inmueblesArrendados = (record.arriendosComoArrendatario || record.arriendos || [])
    .map((arriendo) => {
      const inmueble = arriendo.Inmueble || arriendo.inmueble;
      if (!inmueble) return null;
      return {
        id: inmueble.id_inmueble || inmueble.id,
        nombre:
          inmueble.nombre ||
          inmueble.titulo ||
          inmueble.registro_inmobiliario ||
          'Inmueble',
        direccion: inmueble.direccion || '',
        registro: inmueble.registro_inmobiliario || inmueble.registro || '',
        categoria: inmueble.categoria || inmueble.tipo || '',
        ciudad: inmueble.ciudad,
        departamento: inmueble.departamento,
        estado: inmueble.estado || 'Activo',
      };
    })
    .filter(Boolean);

  return {
    id: renant.id_arrendatario || renant.id || persona.id_persona,
    personaId: persona.id_persona,
    registro: renant.registro_arrendatario || renant.registro || null,
    tipoDocumento: persona.tipo_documento || renant.tipoDocumento || 'CC',
    documento: persona.numero_documento || renant.numero_documento || '',
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    correo: persona.correo || renant.correo || '',
    telefono: persona.telefono || renant.telefono || '',
    estado: renant.estado || (persona.estado === false ? 'Inactivo' : 'Activo'),
    ciudadResidencia: renant.ciudad_residencia || null,
    direccionAnterior: renant.direccion_anterior || null,
    observaciones: renant.observaciones || null,
    contactoEmergenciaNombre: renant.contacto_emergencia?.nombre || renant.contacto_emergencia_nombre || '',
    contactoEmergenciaTelefono: renant.contacto_emergencia?.telefono || renant.contacto_emergencia_telefono || '',
    contactoEmergenciaParentesco: renant.contacto_emergencia?.parentesco || renant.contacto_emergencia_parentesco || '',
    // Campos relacionados con contrato (si vienen en la respuesta)
    fechaInicio: record.fecha_inicio || record.fechaInicio || null,
    fechaFin: record.fecha_finalizacion || record.fechaFin || null,
    valorMensual: record.valor_mensual || record.valorMensual || null,
    tipoGarantia: record.tipoGarantia || null,
    valorGarantia: record.valorGarantia || null,
    descripcionGarantia: record.descripcionGarantia || null,
    inmueblesArrendados,
    raw: record,
  };
};

const buildPayload = (payload = {}) => {
  const nombres = [payload.primerNombre, payload.segundoNombre]
    .filter(Boolean)
    .join(' ')
    .trim();
  const apellidos = [payload.primerApellido, payload.segundoApellido]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    tipo_documento: payload.tipoDocumento || payload.tipo_doc || 'CC',
    numero_documento: payload.documento || payload.numero_documento || '',
    nombre_completo: nombres,
    apellido_completo: apellidos,
    correo: payload.correo || '',
    telefono: payload.telefono || '',
    tipo_arrendatario: payload.tipo_arrendatario || payload.tipoArrendatario || 'Potencial',
    registro_arrendatario: payload.registro_arrendatario || payload.registro || undefined,
    ciudad_residencia: payload.ciudadResidencia,
    direccion_anterior: payload.direccionAnterior,
    contacto_emergencia_nombre: payload.contactoEmergenciaNombre,
    contacto_emergencia_telefono: payload.contactoEmergenciaTelefono,
    contacto_emergencia_parentesco: payload.contactoEmergenciaParentesco,
    observaciones: payload.observaciones,
    estado: payload.estado,
  };
};

export const renantsApiService = {
  async getAll(params = {}) {
    const response = await apiClient.get('/leases/renants', params);
    return extractList(response).map(mapRenantFromApi);
  },

  async getById(id) {
    const response = await apiClient.get(`/leases/renants/${id}`);
    const data = response?.data?.data ?? response?.data ?? response;
    return mapRenantFromApi(data);
  },

  async create(payload) {
    const response = await apiClient.post('/leases/renants', buildPayload(payload));
    const data = response?.data?.data ?? response?.data ?? response;
    return mapRenantFromApi(data);
  },

  async update(id, payload) {
    const response = await apiClient.patch(`/leases/renants/${id}`, buildPayload(payload));
    const data = response?.data?.data ?? response?.data ?? response;
    return mapRenantFromApi(data);
  },

  async delete(id) {
    const response = await apiClient.delete(`/leases/renants/${id}`);
    const data = response?.data?.data ?? response?.data ?? response ?? {};
    return { id: data.id_arrendatario ?? data.id ?? id };
  },
};

export default renantsApiService;
