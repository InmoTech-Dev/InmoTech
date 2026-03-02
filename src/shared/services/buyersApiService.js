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

const normalizeDocByType = (tipo = '', value = '') => {
  const upper = (tipo || '').toString().trim().toUpperCase();
  const raw = (value || '').toString().trim();
  if (upper === 'PAS' || upper === 'PASAPORTE') return raw.replace(/\s+/g, '');
  return raw.replace(/\D/g, '').trim();
};
const normalizeDoc = (value = '') => String(value || '').replace(/\D/g, '').trim();

const normalizeTipo = (value = '') => value.toString().trim().toUpperCase();

// Mapea al formato esperado por el backend/BD (Pasaporte capitalizado)
const mapTipoToBackend = (value = '') => {
  const upper = normalizeTipo(value);
  if (upper === 'PAS' || upper === 'PASAPORTE') return 'Pasaporte';
  return upper;
};
const getTipoVariants = (value = '') => {
  const upper = normalizeTipo(value);
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

const mapBuyerFromApi = (buyer = {}, formData = {}) => {
  const persona = buyer.persona || buyer.Persona || buyer;
  const compra = buyer.compra || buyer.purchase || null;
  const rawBuyerId =
    buyer.id_comprador ??
    buyer.buyerId ??
    buyer.id_buyer ??
    buyer.id;

  // Evitar confundir id de persona con id de comprador
  const compradorId =
    rawBuyerId && rawBuyerId !== buyer?.persona?.id_persona
      ? rawBuyerId
      : buyer?.raw?.id_comprador || null;

  const { first: primerNombre, rest: segundoNombre } = splitNames(
    persona.nombre_completo || buyer.primerNombre || ''
  );
  const { first: primerApellido, rest: segundoApellido } = splitNames(
    persona.apellido_completo || buyer.primerApellido || ''
  );

  return {
    id: compradorId || null, // ID de comprador (no persona)
    compradorId: compradorId || null,
    personaId: persona.id_persona,
    tipoDocumento: persona.tipo_documento || buyer.tipoDocumento || 'CC',
    documento: persona.numero_documento || buyer.documento || '',
    primerNombre: primerNombre || buyer.primerNombre || '',
    segundoNombre: segundoNombre || buyer.segundoNombre || '',
    primerApellido: primerApellido || buyer.primerApellido || '',
    segundoApellido: segundoApellido || buyer.segundoApellido || '',
    correo: persona.correo || buyer.correo || '',
    telefono: persona.telefono || buyer.telefono || '',
    estado: buyer.estado || compra?.estado || (persona.estado === false ? 'Inactivo' : 'Activo'),
    fechaCompra: buyer.fechaCompra || compra?.fecha_compra || '',
    valorCompra: buyer.valorCompra || compra?.valor_compra || '',
    tipoCompra: buyer.tipoCompra || compra?.tipo_compra || '',
    ciudadResidencia: buyer.ciudadResidencia || compra?.ciudad_residencia || '',
    direccionAnterior: buyer.direccionAnterior || compra?.direccion_anterior || '',
    entidadFinanciera: buyer.entidadFinanciera || compra?.entidad_financiera || '',
    numeroCredito: buyer.numeroCredito || compra?.numero_credito || '',
    montoFinanciado: buyer.montoFinanciado || compra?.monto_financiado || '',
    observaciones: buyer.observaciones || compra?.observaciones || '',
    inmueble: buyer.inmueble || compra?.inmueble || null,
    ultima_venta: buyer.ultima_venta || buyer.compra || null,
    formData: buyer.formData || formData,
    compra,
    raw: buyer,
  };
};

const buildPayload = (payload = {}) => {
  const nombres = [payload.primerNombre, payload.segundoNombre].filter(Boolean).join(' ').trim();
  const apellidos = [payload.primerApellido, payload.segundoApellido].filter(Boolean).join(' ').trim();

  return {
    tipo_documento: payload.tipoDocumento || payload.tipo_doc || 'CC',
    numero_documento: payload.documento || payload.numero_documento || '',
    nombre_completo: nombres,
    apellido_completo: apellidos,
    correo: payload.correo || '',
    telefono: payload.telefono || '',
    tipo_comprador: payload.tipo_comprador || payload.tipoComprador || 'Potencial',
    registro_comprador: payload.registro_comprador || payload.registro || undefined,
    ciudad_residencia: payload.ciudadResidencia,
    direccion_anterior: payload.direccionAnterior,
    estado: payload.estado,
    observaciones: payload.observaciones,
  };
};

export const buyersApiService = {
  async findPersonaByDocument(tipoDocumento, numeroDocumento) {
    const numero = normalizeDocByType(tipoDocumento, numeroDocumento);
    const tipo = mapTipoToBackend(tipoDocumento);
    try {
      const response = await apiClient.get('/personas/buscar', {
        params: { tipo_documento: tipo, numero_documento: numero, _ts: Date.now() },
        headers: { 'Cache-Control': 'no-store' }
      });
      let list = extractList(response);
      if (!list.length && Array.isArray(response?.data)) list = response.data;
      if (!list.length && Array.isArray(response?.personas)) list = response.personas;
      if (!list.length) return null;
      const row = list[0];
      return mapBuyerFromApi({
        ...row,
        persona: row,
        raw: row,
        id_comprador: row.id_comprador,
        buyerId: row.id_comprador
      });
    } catch (error) {
      if (import.meta?.env?.DEV) {
        console.warn('[buyersApiService] persona/buscar fallo', { tipo, numero, error: error?.message });
      }
      return null;
    }
  },

  async getAll(params = {}) {
    const response = await apiClient.get('/sales/buyers', { params });
    return extractList(response).map((item) => mapBuyerFromApi(item));
  },

  async findByDocument(tipoDocumento, numeroDocumento) {
    try {
      const params = {
        tipo_documento: normalizeTipo(tipoDocumento),
        numero_documento: normalizeDoc(numeroDocumento),
      };
      const response = await apiClient.get('/sales/buyers', { params });
      const list = extractList(response);
      if (!list.length) {
        const personaMatch = await this.findPersonaByDocument(tipoDocumento, numeroDocumento);
        return personaMatch || null;
      }

      const targetDoc = normalizeDoc(numeroDocumento);
      const targetTipo = normalizeTipo(tipoDocumento);

      const exactMatch = list.find((item) => {
        const doc =
          normalizeDoc(
            item?.numero_documento ||
            item?.documento ||
            item?.persona?.numero_documento
          );

        const tipo =
          normalizeTipo(
            item?.tipo_documento ||
            item?.tipoDocumento ||
            item?.persona?.tipo_documento
          );

        return doc && doc === targetDoc && (!targetTipo || tipo === targetTipo);
      });

      if (!exactMatch) return null;
      return mapBuyerFromApi(exactMatch);
    } catch (error) {
      if (import.meta?.env?.DEV) {
        console.warn('[buyersApiService.findByDocument] fallo', { tipoDocumento, numeroDocumento, error: error?.message });
      }
      return null; // permite fallback a Personas
    }
  },

  async getById(id) {
    const response = await apiClient.get(`/sales/buyers/${id}`);
    const data = response?.data?.data ?? response?.data ?? response;
    return mapBuyerFromApi(data);
  },

  async create(payload) {
    try {
      const response = await apiClient.post('/sales/buyers', buildPayload(payload));
      const data = response?.data?.data ?? response?.data ?? response;
      return mapBuyerFromApi(data, payload);
    } catch (error) {
      const status = error?.status || error?.response?.status;
      if (status !== 409) throw error;

      const existing = await this.findByDocument(payload?.tipoDocumento, payload?.documento);
      if (existing?.id || existing?.compradorId || existing?.raw?.id_comprador) {
        return existing;
      }

      throw error;
    }
  },

  async update(id, payload) {
    const response = await apiClient.patch(`/sales/buyers/${id}`, buildPayload(payload));
    const data = response?.data?.data ?? response?.data ?? response;
    return mapBuyerFromApi(data, payload);
  },

  async delete(id) {
    const response = await apiClient.delete(`/sales/buyers/${id}`);
    const data = response?.data?.data ?? response?.data ?? response ?? {};
    return { id: data.id_comprador ?? data.id ?? id };
  },

  async updatePurchaseData(buyerId, purchaseData = {}) {
    if (!buyerId) {
      throw new Error('Falta id del comprador para actualizar sus datos de compra.');
    }

    const resolveTipoComprador = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (['potencial', 'en proceso', 'finalizado'].includes(normalized)) {
        if (normalized === 'en proceso') return 'En Proceso';
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
      }
      // Si ya se concretó una venta, dejamos el comprador como finalizado.
      return 'Finalizado';
    };

    const payload = {
      tipo_comprador: resolveTipoComprador(purchaseData.tipo_comprador || purchaseData.tipo_compra),
      estado: 'Activo'
    };

    if (purchaseData.observaciones || purchaseData.valor_compra || purchaseData.fecha_compra) {
      const notes = [];
      if (purchaseData.valor_compra !== undefined && purchaseData.valor_compra !== null) {
        notes.push(`Valor compra: ${purchaseData.valor_compra}`);
      }
      if (purchaseData.fecha_compra) {
        notes.push(`Fecha compra: ${purchaseData.fecha_compra}`);
      }
      if (purchaseData.id_venta) {
        notes.push(`Venta ID: ${purchaseData.id_venta}`);
      }
      const extra = String(purchaseData.observaciones || '').trim();
      if (extra) notes.push(extra);
      payload.observaciones = notes.join(' | ').slice(0, 1000);
    }

    await apiClient.patch(`/sales/buyers/${buyerId}`, payload);
    return true;
  },
};

export default buyersApiService;
