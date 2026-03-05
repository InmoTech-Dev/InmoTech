import { useState, useEffect, useCallback } from 'react';
import { inmueblesAPI } from '../../../../../shared/services/propertyApidervice';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const HISTORY_STORAGE_KEY = 'inmuebles:fichas-tecnicas';

const getLocalHistory = () => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('No se pudo leer el historial local de fichas:', error);
    return {};
  }
};

const saveLocalHistory = (id, fichas) => {
  if (typeof window === 'undefined') return;
  try {
    const history = getLocalHistory();
    if (!fichas || !fichas.length) {
      delete history[id];
    } else {
      history[id] = fichas;
    }
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('No se pudo guardar el historial local de fichas:', error);
  }
};

const FIELD_LABELS = {
  titulo: 'Título',
  direccion: 'Dirección',
  ciudad: 'Ciudad',
  departamento: 'Departamento',
  pais: 'País',
  tipo: 'Tipo',
  operacion: 'Operación',
  estado: 'Estado',
  precio_venta: 'Precio de venta',
  precio_arriendo: 'Canon de arriendo',
  descripcion: 'Descripción'
};

const normalizeEstado = (value = '') =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isFinalInmuebleState = (value = '') => {
  const normalized = normalizeEstado(value);
  return normalized === 'arrendado' || normalized === 'vendido';
};

const captureSnapshot = (data = {}) => ({
  titulo: data.titulo,
  direccion: data.direccion,
  ciudad: data.ciudad,
  departamento: data.departamento,
  pais: data.pais,
  tipo: data.tipo || data.categoria,
  operacion: data.operacion,
  estado: data.estado,
  precio_venta: data.precio_venta,
  precio_arriendo: data.precio_arriendo,
  descripcion: data.descripcion,
  comodidades: Array.isArray(data.comodidades) ? JSON.parse(JSON.stringify(data.comodidades)) : [],
  imagenes: Array.isArray(data.imagenes) ? [...data.imagenes] : [],
  propietario: data.propietario ? JSON.parse(JSON.stringify(data.propietario)) : null,
  registro: data.registro,
  area_construida: data.area_construida
});

const mergeInmuebleData = (apiData = {}, clientData = {}, previous = {}) => ({
  ...previous,
  ...apiData,
  titulo: clientData.titulo ?? apiData.titulo ?? previous.titulo,
  tipo: clientData.tipo ?? apiData.tipo ?? previous.tipo,
  categoria: clientData.categoria ?? apiData.categoria ?? previous.categoria,
  operacion: clientData.operacion ?? apiData.operacion ?? previous.operacion,
  estado: clientData.estado ?? apiData.estado ?? previous.estado,
  descripcion: clientData.descripcion ?? apiData.descripcion ?? previous.descripcion,
  barrio: clientData.barrio ?? apiData.barrio ?? previous.barrio,
  pais: clientData.pais ?? apiData.pais ?? previous.pais,
  precio_venta: clientData.precio_venta ?? apiData.precio_venta ?? previous.precio_venta,
  precio_arriendo: clientData.precio_arriendo ?? apiData.precio_arriendo ?? previous.precio_arriendo,
  comodidades: clientData.comodidades ?? apiData.comodidades ?? previous.comodidades ?? [],
  imagenes: clientData.imagenes ?? apiData.imagenes ?? previous.imagenes ?? [],
  fichasTecnicas: clientData.fichasTecnicas ?? apiData.fichasTecnicas ?? previous.fichasTecnicas ?? [],
  propietario: clientData.propietario || apiData.propietario || previous.propietario || null,
  propietarios: clientData.propietario
    ? [clientData.propietario]
    : apiData.propietarios?.length
      ? apiData.propietarios
      : previous.propietarios || []
});

const buildFichaTecnica = (previous = {}, next = {}, motivo = 'Actualización general', changedFields = null) => {
  const cambios = [];
  const previousFicha = previous?.fichasTecnicas?.[0] || null;
  const baseForDiff = previousFicha?.snapshot || previous;
  const version = (previousFicha?.version || 0) + 1;
  const formatText = (value) => String(value ?? '').trim() || '—';
  const formatMoney = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return 'sin valor';
    return `$${numericValue.toLocaleString('es-CO')}`;
  };
  const normalizeFieldValue = (field, value) => {
    if (value === null || value === undefined) return '';

    if (['precio_venta', 'precio_arriendo', 'area_construida'].includes(field)) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : '';
    }

    if (typeof value === 'string') return value.trim();
    return value;
  };

  const buildAmenitiesMap = (source = {}) =>
    (source?.comodidades || []).reduce((acc, item) => {
      if (!item?.seleccionada || !item?.nombre) return acc;
      const key = String(item.nombre).trim().toLowerCase();
      const qty = Number(item.cantidad) > 0 ? Number(item.cantidad) : 1;
      acc[key] = { nombre: item.nombre, cantidad: qty };
      return acc;
    }, {});

  const amenityChanges = (prevSource = {}, nextSource = {}) => {
    const prevMap = buildAmenitiesMap(prevSource);
    const nextMap = buildAmenitiesMap(nextSource);
    const keys = new Set([...Object.keys(prevMap), ...Object.keys(nextMap)]);
    const diffs = [];

    keys.forEach((key) => {
      const prevQty = prevMap[key]?.cantidad || 0;
      const nextQty = nextMap[key]?.cantidad || 0;
      const diff = nextQty - prevQty;
      if (diff === 0) return;
      const displayName = nextMap[key]?.nombre || prevMap[key]?.nombre || key;
      const sign = diff > 0 ? `+${diff}` : String(diff);
      diffs.push(`${displayName}${sign}`);
    });

    return diffs;
  };

  const galleryLabel = (source = {}) => {
    const count = Array.isArray(source?.imagenes) ? source.imagenes.length : 0;
    return `${count} imagen(es)`;
  };
  const ownerLabel = (source = {}) => {
    const owner = source?.propietario || {};
    const name =
      owner.nombreCompleto ||
      [owner.nombres, owner.apellidos].filter(Boolean).join(' ').trim() ||
      owner.nombre ||
      owner.nombre_completo;
    return formatText(name);
  };

  Object.entries(FIELD_LABELS).forEach(([field, label]) => {
    if (changedFields && !changedFields.has(field)) return;

    const prevValue = normalizeFieldValue(field, baseForDiff?.[field]);
    const nextValue = normalizeFieldValue(field, next?.[field]);
    if (prevValue !== nextValue) {
      if (field === 'precio_arriendo') {
        cambios.push(`Canon de arriendo actualizado: de ${formatMoney(prevValue)} a ${formatMoney(nextValue)}`);
        return;
      }
      cambios.push(`${label}: ${formatText(prevValue)} → ${formatText(nextValue)}`);
    }
  });

  const serialize = (value) => JSON.stringify(value || []);

  if ((!changedFields || changedFields.has('comodidades')) && serialize(baseForDiff.comodidades) !== serialize(next.comodidades)) {
    const diffs = amenityChanges(baseForDiff, next);
    const amenityChangeDescription = String(next?.descripcion_cambio_comodidades ?? '').trim();
    if (diffs.length) {
      cambios.push(...diffs);
    } else {
      cambios.push('Caracteristicas actualizadas');
    }
    if (amenityChangeDescription) {
      cambios.push(`Descripcion del cambio en comodidades: ${amenityChangeDescription}`);
    }
  }

  if ((!changedFields || changedFields.has('imagenes')) && serialize(baseForDiff.imagenes) !== serialize(next.imagenes)) {
    cambios.push(`Galeria: ${galleryLabel(baseForDiff)} → ${galleryLabel(next)}`);
  }

  if (
    (!changedFields || changedFields.has('propietario') || changedFields.has('propietarioId') || changedFields.has('propietario_id')) &&
    JSON.stringify(baseForDiff.propietario || null) !== JSON.stringify(next.propietario || null)
  ) {
    cambios.push(`Propietario: ${ownerLabel(baseForDiff)} → ${ownerLabel(next)}`);
  }

  return {
    id: `ficha-${Date.now()}`,
    version,
    fecha: new Date().toLocaleDateString('es-CO'),
    cambios: version === 1 ? '' : (cambios.length ? cambios.join(' | ') : motivo),
    snapshot: captureSnapshot(next)
  };
};

export const useProperty = () => {
  const [inmuebles, setInmuebles] = useState([]);
  const [pagination, setPagination] = useState({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    totalPages: 1,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarInmuebles = useCallback(async (page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, filters = {}) => {
    setLoading(true);
    try {
      const { items, pagination: apiPagination } = await inmueblesAPI.getInmuebles(page, limit, filters);
      const history = getLocalHistory();
      const enrichedItems = items.map((item) => {
        const localHistory = history[item.id];
        const remoteFichas = Array.isArray(item.fichasTecnicas) ? item.fichasTecnicas : [];
        const mergedHistory = Array.isArray(localHistory) && localHistory.length
          ? [...localHistory.map((f) => ({ ...f })), ...remoteFichas]
          : [...remoteFichas];

        let enrichedItem = {
          ...item,
          fichasTecnicas: mergedHistory
        };

        const latestFicha = mergedHistory[0];
        const previousEstado = latestFicha?.snapshot?.estado;
        const currentEstado = enrichedItem?.estado;
        const stateChanged = previousEstado && normalizeEstado(previousEstado) !== normalizeEstado(currentEstado);
        const becameFinalState = stateChanged && isFinalInmuebleState(currentEstado);

        if (becameFinalState) {
          const nuevaFicha = buildFichaTecnica(
            { ...enrichedItem, fichasTecnicas: mergedHistory },
            enrichedItem,
            `Cambio automatico de estado a ${currentEstado}`
          );
          enrichedItem = {
            ...enrichedItem,
            fichasTecnicas: [nuevaFicha, ...mergedHistory]
          };
          saveLocalHistory(enrichedItem.id, enrichedItem.fichasTecnicas);
        }

        if (Array.isArray(localHistory) && localHistory.length) {
          return enrichedItem;
        }
        return enrichedItem;
      });
      setInmuebles(enrichedItems);
      setPagination({
        page: apiPagination.pagina ?? page,
        limit: apiPagination.limite ?? limit,
        totalPages: apiPagination.paginas_totales ?? 1,
        total: apiPagination.total ?? items.length
      });
      setError(null);
    } catch (err) {
      console.error('Error al cargar inmuebles:', err);
      setError(err.message || 'No se pudo cargar la información de inmuebles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarInmuebles();
  }, [cargarInmuebles]);

  const crearInmueble = async (inmuebleData) => {
    try {
      const nuevoInmueble = await inmueblesAPI.createInmueble(inmuebleData);
      const enriched = mergeInmuebleData(nuevoInmueble, inmuebleData);
      enriched.fichasTecnicas = [
        buildFichaTecnica({}, enriched, 'Registro inicial del inmueble'),
        ...(nuevoInmueble.fichasTecnicas || [])
      ];
      setInmuebles((prev) => [enriched, ...prev]);
      saveLocalHistory(enriched.id, enriched.fichasTecnicas);
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1
      }));
      return enriched;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const actualizarInmueble = async (id, inmuebleData) => {
    try {
      const previo = inmuebles.find((item) => item.id === id) || {};
      const prevFichasClon = (previo.fichasTecnicas || []).map((ficha) => ({
        ...ficha,
        snapshot: ficha.snapshot ? JSON.parse(JSON.stringify(ficha.snapshot)) : undefined
      }));

      const { descripcion_cambio_comodidades, ...apiPayload } = inmuebleData || {};
      const changedFields = new Set(Object.keys(apiPayload || {}));

      if (changedFields.has('precioVenta')) {
        changedFields.add('precio_venta');
      }
      if (changedFields.has('precioArriendo')) {
        changedFields.add('precio_arriendo');
      }
      if (changedFields.has('areaConstruida')) {
        changedFields.add('area_construida');
      }
      if (changedFields.has('tipo')) {
        changedFields.add('categoria');
      }
      const inmuebleActualizado = await inmueblesAPI.updateInmueble(id, apiPayload);
      const enriched = mergeInmuebleData(inmuebleActualizado, apiPayload, { ...previo, fichasTecnicas: prevFichasClon });
      const nuevaFicha = buildFichaTecnica(
        previo,
        { ...enriched, descripcion_cambio_comodidades },
        descripcion_cambio_comodidades || 'Actualización general',
        changedFields
      );
      enriched.fichasTecnicas = [nuevaFicha, ...prevFichasClon];

      setInmuebles((prev) =>
        prev.map((inmueble) => (inmueble.id === id ? enriched : inmueble))
      );
      saveLocalHistory(enriched.id, enriched.fichasTecnicas);
      return enriched;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const eliminarInmueble = async (id) => {
    try {
      await inmueblesAPI.deleteInmueble(id);
      setInmuebles((prev) => prev.filter((item) => item.id !== id));
      saveLocalHistory(id, []);
      setPagination((prev) => ({
        ...prev,
        total: Math.max(prev.total - 1, 0)
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    inmuebles,
    pagination,
    loading,
    error,
    cargarInmuebles,
    crearInmueble,
    actualizarInmueble,
    eliminarInmueble
  };
};


