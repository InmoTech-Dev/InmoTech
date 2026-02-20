import { apiClient } from './api.config';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeInmueble = (item = {}) => ({
  id: item.id_inmueble,
  titulo: item.titulo || 'Inmueble sin titulo',
  registro: item.registro_inmobiliario || 'Sin registro',
  direccion: item.direccion || 'Sin direccion',
  ciudad: item.ciudad || '',
  operacion: item.operacion || 'Sin definir',
  categoria: item.categoria || 'Sin categoria',
  estadoInmueble: item.estado_inmueble || 'Sin estado',
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

    return {
      propietario: data.propietario || null,
      resumen: data.resumen || {
        total_inmuebles: 0,
        inmuebles_con_arriendo: 0,
        arriendos_activos: 0,
        canon_total_estimado: 0
      },
      inmuebles: Array.isArray(data.inmuebles) ? data.inmuebles.map(normalizeInmueble) : []
    };
  }
}

export default new OwnerPortalApiService();
