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

const normalizeDoc = (value = '') =>
  value
    .toString()
    .replace(/\D/g, '')
    .trim();

const normalizeTipo = (value = '') => value.toString().trim().toUpperCase();

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
  async getAll(params = {}) {
    const response = await apiClient.get('/sales/buyers', params);
    return extractList(response).map((item) => mapBuyerFromApi(item));
  },

  async findByDocument(tipoDocumento, numeroDocumento) {
    const params = {
      tipo_documento: (tipoDocumento || '').trim(),
      numero_documento: (numeroDocumento || '').trim(),
    };
    const response = await apiClient.get('/sales/buyers', params);
    const list = extractList(response);
    if (!list.length) return null;

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
  },

  async getById(id) {
    const response = await apiClient.get(`/sales/buyers/${id}`);
    const data = response?.data?.data ?? response?.data ?? response;
    return mapBuyerFromApi(data);
  },

  async create(payload) {
    const response = await apiClient.post('/sales/buyers', buildPayload(payload));
    const data = response?.data?.data ?? response?.data ?? response;
    return mapBuyerFromApi(data, payload);
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
    await apiClient.patch(`/sales/buyers/${buyerId}`, {
      ...purchaseData,
      tipo_comprador: purchaseData.tipo_compra || purchaseData.tipo_comprador || 'Potencial',
    });
    return true;
  },
};

export default buyersApiService;
