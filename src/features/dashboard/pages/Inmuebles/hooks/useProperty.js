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

const buildFichaTecnica = (previous = {}, next = {}, motivo = 'Actualización general') => {
  const cambios = [];

  Object.entries(FIELD_LABELS).forEach(([field, label]) => {
    const prevValue = previous?.[field] ?? '';
    const nextValue = next?.[field] ?? '';
    if (prevValue !== nextValue) {
      cambios.push(`${label}: ${prevValue || '—'} → ${nextValue || '—'}`);
    }
  });

  const serialize = (value) => JSON.stringify(value || []);

  if (serialize(previous.comodidades) !== serialize(next.comodidades)) {
    cambios.push('Comodidades actualizadas');
  }

  if (serialize(previous.imagenes) !== serialize(next.imagenes)) {
    cambios.push('Galería actualizada');
  }

  if (JSON.stringify(previous.propietario || null) !== JSON.stringify(next.propietario || null)) {
    cambios.push('Propietario actualizado');
  }

  const version = (previous?.fichasTecnicas?.[0]?.version || 0) + 1;

  return {
    id: `ficha-${Date.now()}`,
    version,
    fecha: new Date().toLocaleDateString('es-CO'),
    cambios: cambios.length ? cambios.join(' | ') : motivo,
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
        if (Array.isArray(localHistory) && localHistory.length) {
          return {
            ...item,
            fichasTecnicas: [...localHistory.map((f) => ({ ...f })), ...(item.fichasTecnicas || [])]
          };
        }
        return item;
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

      const inmuebleActualizado = await inmueblesAPI.updateInmueble(id, inmuebleData);
      const enriched = mergeInmuebleData(inmuebleActualizado, inmuebleData, { ...previo, fichasTecnicas: prevFichasClon });
      const nuevaFicha = buildFichaTecnica(previo, enriched);
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
