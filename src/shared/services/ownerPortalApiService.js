import { apiClient } from './api.config';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value = '') =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const normalizeInmueble = (item = {}) => ({
  id: item.id_inmueble,
  titulo: item.titulo || 'Inmueble sin titulo',
  registro: item.registro_inmobiliario || 'Sin registro',
  direccion: item.direccion || 'Sin direccion',
  ciudad: item.ciudad || '',
  operacion: item.operacion || 'Sin definir',
  categoria: item.categoria || 'Sin categoria',
  estadoInmueble: item.estado_inmueble || item.estado_frontend || 'Sin estado',
  estadoFrontend: item.estado_frontend || item.estado_inmueble || 'Sin estado',
  precioVenta: toNumber(item.precio_venta),
  precioArriendo: toNumber(item.precio_arriendo),
  canon: toNumber(item.canon_estimado ?? item?.arriendo?.valor_mensual ?? item.precio_arriendo),
  arriendo: item.arriendo
    ? {
        id: item.arriendo.id_arrendamiento,
        estado: item.arriendo.estado || 'Sin estado',
        fechaInicio: item.arriendo.fecha_inicio,
        fechaFinalizacion: item.arriendo.fecha_finalizacion,
        valorMensual: toNumber(item.arriendo.valor_mensual),
        tipoGarantia: item.arriendo.tipo_garantia || null
      }
    : null,
  arrendatario: item.arrendatario
    ? {
        id: item.arrendatario.id_arrendatario,
        nombre: item.arrendatario.nombre_completo || 'Sin nombre',
        correo: item.arrendatario.correo || null,
        telefono: item.arrendatario.telefono || null
      }
    : null
});

class OwnerPortalApiService {
  async getMyPortfolio() {
    const response = await apiClient.get('/personas/me/inmuebles');
    const payload = response?.data || response;
    const data = payload?.data || payload || {};

    const inmuebles = Array.isArray(data.inmuebles) ? data.inmuebles.map(normalizeInmueble) : [];
    const resumenApi = data.resumen || {};
    const incluirOperacion = (operacion = '', keyword = '') =>
      String(operacion || '').toLowerCase().includes(keyword);
    const canonCalculado = inmuebles.reduce((acc, item) => {
      if (normalizeText(item.estadoInmueble) !== 'arrendado') return acc;
      return acc + toNumber(item.precioArriendo || item.canon);
    }, 0);

    return {
      propietario: data.propietario || null,
      resumen: {
        total_inmuebles: toNumber(resumenApi.total_inmuebles) || inmuebles.length,
        inmuebles_venta:
          toNumber(resumenApi.inmuebles_venta) ||
          inmuebles.filter((item) => incluirOperacion(item.operacion, 'venta')).length,
        inmuebles_arriendo:
          toNumber(resumenApi.inmuebles_arriendo) ||
          inmuebles.filter((item) => incluirOperacion(item.operacion, 'arriendo')).length,
        canon_total_esperado: toNumber(resumenApi.canon_total_esperado) || canonCalculado
      },
      inmuebles
    };
  }
}

export default new OwnerPortalApiService();
