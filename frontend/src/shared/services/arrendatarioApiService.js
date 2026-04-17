import { apiClient } from './api.config';

const extractList = (response) => {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
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

const splitNames = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [first = '', second = ''] = parts;
  const [last = '', secondLast = ''] = parts.length > 2 ? parts.slice(-2) : [parts[1] || '', ''];
  return {
    first,
    rest: parts.slice(1).join(' ') || second || '',
    last,
    secondLast,
  };
};

const mapImageEntry = (image = {}) => ({
  id_imagen: image.id_imagen || image.id || null,
  ruta_archivo: image.ruta_archivo || image.url || image.src || '',
  nombre_archivo: image.nombre_archivo || image.nombre || '',
  es_principal: Boolean(image.es_principal),
  orden: image.orden ?? null,
});

const resolveInmuebleTitle = (inmueble = {}) =>
  inmueble.titulo ||
  inmueble.nombre ||
  inmueble.nombre_comercial ||
  inmueble.nombre_inmueble ||
  inmueble.registro_inmobiliario ||
  inmueble.registro ||
  inmueble.direccion ||
  null;

const resolveInmuebleImage = (inmueble = {}) => {
  const imagenes = Array.isArray(inmueble.imagenes) ? inmueble.imagenes : [];
  const principal = imagenes.find((img) => Boolean(img?.es_principal)) || imagenes[0] || null;
  return (
    inmueble.imagen_principal ||
    inmueble.image ||
    inmueble.imagen_portada ||
    inmueble.portada ||
    inmueble.secure_url ||
    principal?.ruta_archivo ||
    principal?.url ||
    principal?.src ||
    ''
  );
};

const mapInmuebleSummary = (inmueble = {}) => {
  if (!inmueble || typeof inmueble !== 'object') return null;
  const titulo = resolveInmuebleTitle(inmueble);
  const registro = inmueble.registro_inmobiliario || inmueble.registro || '';
  const id = inmueble.id_inmueble || inmueble.id || null;
  if (!titulo && !registro && !id) return null;

  return {
    ...inmueble,
    id,
    nombre: titulo || 'Inmueble',
    titulo: inmueble.titulo || titulo || '',
    direccion: inmueble.direccion || '',
    registro,
    categoria: inmueble.categoria || inmueble.tipo || '',
    ciudad: inmueble.ciudad,
    departamento: inmueble.departamento,
    estado: inmueble.estado || 'Activo',
    imagen_principal: resolveInmuebleImage(inmueble),
    imagenes: Array.isArray(inmueble.imagenes) ? inmueble.imagenes.map(mapImageEntry) : [],
  };
};

const mapRenantFromApi = (record = {}) => {
  const persona = record.persona || record.Persona || record;
  const renant = record.renant || record;
  const codeudor =
    record.codeudor ||
    record.Codeudor ||
    record.codeudor_persona ||
    record.codeudorPersona ||
    (Array.isArray(record.arriendos) && record.arriendos[0]?.codeudor) ||
    {};
  const codeudorPersona =
    codeudor?.persona ||
    codeudor?.Persona ||
    (codeudor?.id_persona ? codeudor : {}) ||
    {};

  const { first: primerNombre, rest: segundoNombre } = splitNames(
    persona.nombre_completo || persona.nombres || ''
  );
  const { first: primerApellido, rest: segundoApellido } = splitNames(
    persona.apellido_completo || persona.apellidos || ''
  );
  const codeudorNombreCompleto = codeudorPersona.nombre_completo || codeudor.nombre_completo || '';
  const {
    first: primerNombreCodeudor,
    rest: segundoNombreCodeudor,
    last: primerApellidoCodeudor,
    secondLast: segundoApellidoCodeudor,
  } = splitNames(codeudorNombreCompleto);

  const arriendos = record.arriendosComoArrendatario || record.arriendos || [];
  const primaryLease = Array.isArray(arriendos) && arriendos.length > 0 ? arriendos[0] : null;
  const directInmueble =
    record.Inmueble ||
    record.inmueble ||
    record.propiedad ||
    record.Propiedad ||
    renant.Inmueble ||
    renant.inmueble ||
    renant.propiedad ||
    renant.Propiedad ||
    null;

  const inmueblesArrendados = arriendos
    .map((arriendo) => mapInmuebleSummary(arriendo.Inmueble || arriendo.inmueble || arriendo.propiedad || arriendo.Propiedad))
    .filter(Boolean);

  const directInmuebleSummary = mapInmuebleSummary(directInmueble);
  if (
    directInmuebleSummary &&
    !inmueblesArrendados.some(
      (item) =>
        (item.id && directInmuebleSummary.id && item.id === directInmuebleSummary.id) ||
        (item.registro && directInmuebleSummary.registro && item.registro === directInmuebleSummary.registro)
    )
  ) {
    inmueblesArrendados.unshift(directInmuebleSummary);
  }

  const inmueblePrincipal =
    primaryLease?.Inmueble ||
    primaryLease?.inmueble ||
    primaryLease?.propiedad ||
    primaryLease?.Propiedad ||
    directInmueble ||
    inmueblesArrendados[0] ||
    null;
  const inmuebleResolved = mapInmuebleSummary(inmueblePrincipal) || directInmuebleSummary || inmueblesArrendados[0] || null;

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
    estado:
      renant.estado_arrendatario ||
      renant.estado ||
      record.estado_arrendatario ||
      record.raw?.estado_arrendatario ||
      null,
    ciudadResidencia: renant.ciudad_residencia || null,
    direccionAnterior: renant.direccion_anterior || null,
    observaciones: renant.observaciones || null,
    contactoEmergenciaNombre:
      renant.contacto_emergencia?.nombre ||
      renant.contacto_emergencia_nombre ||
      codeudorPersona.nombre_completo ||
      codeudor.nombre_completo ||
      '',
    contactoEmergenciaTelefono:
      renant.contacto_emergencia?.telefono ||
      renant.contacto_emergencia_telefono ||
      codeudorPersona.telefono ||
      codeudor.telefono ||
      '',
    contactoEmergenciaParentesco:
      renant.contacto_emergencia?.parentesco ||
      renant.contacto_emergencia_parentesco ||
      (codeudorPersona.nombre_completo || codeudor.nombre_completo ? 'Codeudor' : ''),
    contactoEmergenciaCorreo:
      renant.contacto_emergencia?.correo ||
      renant.contacto_emergencia_correo ||
      codeudorPersona.correo ||
      codeudor.correo ||
      '',
    actividadEconomicaCodeudor:
      codeudorPersona.actividad_economica ||
      codeudor.actividad_economica ||
      null,
    rawLease: primaryLease || null,
    codeudorNombre: codeudorPersona.nombre_completo || codeudor.nombre_completo || '',
    codeudorTelefono: codeudorPersona.telefono || codeudor.telefono || '',
    codeudorCorreo: codeudorPersona.correo || codeudor.correo || '',
    // Campos relacionados con contrato (si vienen en la respuesta)
    fechaInicio: record.fecha_inicio || record.fechaInicio || primaryLease?.fecha_inicio || primaryLease?.fechaInicio || null,
    fechaFin: record.fecha_finalizacion || record.fechaFin || primaryLease?.fecha_fin || primaryLease?.fechaFinal || null,
    valorMensual: record.valor_mensual || record.valorMensual || primaryLease?.canon || primaryLease?.valor_mensual || primaryLease?.valorMensual || null,
    tipoGarantia: record.tipoGarantia || null,
    valorGarantia: record.valorGarantia || null,
    descripcionGarantia: record.descripcionGarantia || null,
    estadoContrato: record.estado || primaryLease?.estado || null,
    inmueble: inmuebleResolved,
    registroInmobiliario: inmuebleResolved?.registro || inmuebleResolved?.registro_inmobiliario || null,
    tipoInmueble: inmuebleResolved?.categoria || inmuebleResolved?.tipo || null,
    nombreInmueble: resolveInmuebleTitle(inmuebleResolved || {}) || null,
    direccion: inmuebleResolved?.direccion || null,
    ciudad: inmuebleResolved?.ciudad || null,
    departamento: inmuebleResolved?.departamento || null,
    inmueblesArrendados,
    // Codeudor detalle
    codeudorNombre: codeudorNombreCompleto || null,
    codeudorTelefono: codeudorPersona.telefono || codeudor.telefono || null,
    codeudorCorreo: codeudorPersona.correo || codeudor.correo || null,
    actividadEconomicaCodeudor:
      codeudorPersona.actividad_economica || codeudor.actividad_economica || null,
    primerNombreCodeudor: primerNombreCodeudor || null,
    segundoNombreCodeudor: segundoNombreCodeudor || null,
    primerApellidoCodeudor: primerApellidoCodeudor || null,
    segundoApellidoCodeudor: segundoApellidoCodeudor || null,
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

const normalizeDocByType = (tipo = '', value = '') => {
  const upper = (tipo || '').toString().trim().toUpperCase();
  const raw = (value || '').toString().trim();
  if (upper === 'PAS' || upper === 'PASAPORTE') return raw.replace(/\s+/g, '');
  return raw.replace(/\D/g, '').trim();
};


// Mapea al formato esperado por el backend/BD (Pasaporte capitalizado)
const mapTipoToBackend = (value = '') => {
  const upper = (value || '').toString().trim().toUpperCase();
  if (upper === 'PAS' || upper === 'PASAPORTE') return 'Pasaporte';
  return upper;
};

const pickExactMatch = (list = [], tipoDocumento, numeroDocumento) => {
  const targetDoc = normalizeDoc(numeroDocumento);
  const targetTipo = mapTipoToBackend(tipoDocumento);

  return list.find((item) => {
    const docItem = normalizeDoc(
      item?.numero_documento ||
      item?.documento ||
      item?.persona?.numero_documento
    );
    const tipoItem = mapTipoToBackend(
      item?.tipo_documento ||
      item?.tipoDocumento ||
      item?.persona?.tipo_documento
    );
    return docItem === targetDoc && (!targetTipo || tipoItem === targetTipo);
  });
};

const getTipoVariants = (value = '') => {
  const upper = (value || '').toString().trim().toUpperCase();
  const variants = [upper];
  const mapLong = {
    CC: 'Cedula de Ciudadania',
    CE: 'Cedula de Extranjeria',
    TI: 'Tarjeta de Identidad',
    PAS: 'Pasaporte',
    PASAPORTE: 'Pasaporte',
  };
  if (mapLong[upper]) variants.push(mapLong[upper]);
  return Array.from(new Set(variants.filter(Boolean)));
};

export const renantsApiService = {
  async findByDocument(tipoDocumento, numeroDocumento) {
    const params = {
      // El SP espera 'Pasaporte' capitalizado y tipos exactos
      tipo_documento: mapTipoToBackend(tipoDocumento),
      numero_documento: normalizeDocByType(tipoDocumento, numeroDocumento),
    };
    try {
      const response = await apiClient.get('/leases/renants', { params });
      const list = extractList(response);
      if (!Array.isArray(list) || !list.length) {
        const personaMatch = await this.findPersonaByDocument(tipoDocumento, numeroDocumento);
        return personaMatch || null;
      }
      const exact = pickExactMatch(list, tipoDocumento, numeroDocumento);
      if (!exact) {
        const personaMatch = await this.findPersonaByDocument(tipoDocumento, numeroDocumento);
        return personaMatch || null;
      }
      return mapRenantFromApi(exact);
    } catch (_err) {
      const personaMatch = await this.findPersonaByDocument(tipoDocumento, numeroDocumento);
      return personaMatch || null;
    }
  },

  async findPersonaByDocument(tipoDocumento, numeroDocumento) {
    const numero = normalizeDocByType(tipoDocumento, numeroDocumento);
    const tipo = mapTipoToBackend(tipoDocumento);
    const debugCtx = { service: 'renantsApiService.findPersonaByDocument', tipo, numero };
    const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache' };

    const tryParseList = (payload) => {
      if (!payload) return [];
      let list = extractList(payload);
      if (!list.length && Array.isArray(payload?.data)) list = payload.data;
      if (!list.length && Array.isArray(payload?.personas)) list = payload.personas;
      return Array.isArray(list) ? list : [];
    };

    // 1) /personas/buscar con tipo_documento exacto
    try {
      const resp = await apiClient.get('/personas/buscar', {
        params: { tipo_documento: tipo, numero_documento: numero, _ts: Date.now() },
        headers,
      });
      const list = tryParseList(resp);
      const persona = pickExactMatch(list, tipoDocumento, numeroDocumento);
      if (persona) return mapRenantFromApi({ persona, renant: persona, raw: persona });
    } catch (err) {
      if (import.meta?.env?.DEV) console.warn('[arr persona/buscar 1] fallo', { ...debugCtx, err: err?.message });
    }

    // 2) /personas/buscar con alias de tipo_doc
    const altTipoKeys = ['tipo_doc', 'tipoDocumento', 'tipo'];
    for (const key of altTipoKeys) {
      try {
        const resp = await apiClient.get('/personas/buscar', {
          params: { numero_documento: numero, [key]: tipo, _ts: Date.now() },
          headers,
        });
        const list = tryParseList(resp);
        const persona = pickExactMatch(list, tipoDocumento, numeroDocumento);
        if (persona) return mapRenantFromApi({ persona, renant: persona, raw: persona });
      } catch (_err) {
        if (import.meta?.env?.DEV) console.warn('[arr persona/buscar alt] fallo', { ...debugCtx, key, err: _err?.message });
      }
    }

    // 3) /personas con parámetros variados
    try {
      const resp = await apiClient.get('/personas', {
        params: {
          numero,
          documento: numero,
          numero_documento: numero,
          tipo,
          tipo_documento: tipo,
          _ts: Date.now(),
        },
        headers,
      });
      const list = tryParseList(resp);
      const persona = pickExactMatch(list, tipoDocumento, numeroDocumento);
      if (persona) return mapRenantFromApi({ persona, renant: persona, raw: persona });
    } catch (_err) {
      if (import.meta?.env?.DEV) console.warn('[arr personas] fallo', { ...debugCtx, err: _err?.message });
    }

    // 4) /personas/{numero}
    try {
      const resp = await apiClient.get(`/personas/${numero}`, { headers, params: { _ts: Date.now() } });
      const list = tryParseList(resp);
      const persona = pickExactMatch(list, tipoDocumento, numeroDocumento);
      if (persona) return mapRenantFromApi({ persona, renant: persona, raw: persona });
    } catch (_err) {}

    // 5) /personas/documento/{numero}
    try {
      const resp = await apiClient.get(`/personas/documento/${numero}`, { headers, params: { _ts: Date.now() } });
      const list = tryParseList(resp);
      const persona = pickExactMatch(list, tipoDocumento, numeroDocumento);
      if (persona) return mapRenantFromApi({ persona, renant: persona, raw: persona });
    } catch (_err) {}

    // 6) /personas/numero/{numero}
    try {
      const resp = await apiClient.get(`/personas/numero/${numero}`, { headers, params: { _ts: Date.now() } });
      const list = tryParseList(resp);
      const persona = pickExactMatch(list, tipoDocumento, numeroDocumento);
      if (persona) return mapRenantFromApi({ persona, renant: persona, raw: persona });
    } catch (_err) {}

    // 7) POST /personas/buscar
    try {
      const resp = await apiClient.post('/personas/buscar', {
        tipo_documento: tipo,
        numero_documento: numero,
      }, headers);
      const list = tryParseList(resp);
      const persona = pickExactMatch(list, tipoDocumento, numeroDocumento);
      if (persona) return mapRenantFromApi({ persona, renant: persona, raw: persona });
    } catch (_err) {
      if (import.meta?.env?.DEV) console.warn('[arr persona/buscar POST] fallo', { ...debugCtx, err: _err?.message });
    }

    return null;
  },

  async getAll(params = {}) {
    const response = await apiClient.get('/leases/renants', {
      params,
      disableDedup: Boolean(params?.search),
    });
    return {
      data: extractList(response).map(mapRenantFromApi),
      pagination: extractPagination(response, params)
    };
  },

  async getById(id) {
    const response = await apiClient.get(`/leases/renants/${id}`);
    const data = response?.data?.data ?? response?.data ?? response;
    return mapRenantFromApi(data);
  },

  async create(payload) {
    try {
      const response = await apiClient.post('/leases/renants', buildPayload(payload));
      const data = response?.data?.data ?? response?.data ?? response;
      return mapRenantFromApi(data);
    } catch (error) {
      const status = error?.status || error?.response?.status;
      if (status !== 409) throw error;

      const existing = await this.findByDocument(payload?.tipoDocumento, payload?.documento);
      if (existing?.id || existing?.id_arrendatario || existing?.raw?.id_arrendatario) {
        return existing;
      }

      throw error;
    }
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
const normalizeDoc = (value = '') => value.toString().replace(/\D/g, '').trim();
