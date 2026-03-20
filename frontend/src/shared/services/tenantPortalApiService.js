import { apiClient } from './api.config';
import { uploadToCloudinary } from './cloudinary';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeFactura = (item = {}) => ({
  idCobro: item.id_cobro,
  idArrendamiento: item.id_arrendamiento,
  estado: item.estado || 'Pendiente',
  fechaCobro: item.fecha_cobro || null,
  fechaLimite: item.fecha_limite || null,
  fechaPago: item.fecha_pago || null,
  valorPago: toNumber(item.valor_pago),
  inmueble: {
    id: item?.inmueble?.id_inmueble || null,
    titulo: item?.inmueble?.titulo || 'Inmueble',
    registro: item?.inmueble?.registro_inmobiliario || 'Sin registro',
    direccion: item?.inmueble?.direccion || '',
    ciudad: item?.inmueble?.ciudad || ''
  },
  comprobante: item?.comprobante
    ? {
        id: item.comprobante.id_comprobante,
        url: item.comprobante.url_comprobante,
        entidadBancaria: item.comprobante.entidad_bancaria,
        referenciaBancaria: item.comprobante.referencia_bancaria,
        montoPagado: toNumber(item.comprobante.monto_pagado),
        estado: item.comprobante.estado,
        fechaPago: item.comprobante.fecha_pago,
        observaciones: item.comprobante.observaciones
      }
    : null
});

class TenantPortalApiService {
  async getMyBillingSummary() {
    const response = await apiClient.get('/personas/me/facturas');
    const payload = response?.data || response;
    const data = payload?.data || payload || {};

    return {
      arrendatario: data.arrendatario || null,
      resumen: {
        totalFacturas: toNumber(data?.resumen?.total_facturas),
        facturasPagadas: toNumber(data?.resumen?.facturas_pagadas),
        facturasPendientes: toNumber(data?.resumen?.facturas_pendientes),
        facturasVencidas: toNumber(data?.resumen?.facturas_vencidas),
        totalValor: toNumber(data?.resumen?.total_valor),
        totalPagado: toNumber(data?.resumen?.total_pagado),
        totalPendiente: toNumber(data?.resumen?.total_pendiente)
      },
      facturas: Array.isArray(data.facturas) ? data.facturas.map(normalizeFactura) : []
    };
  }

  async uploadPaymentReceipt(factura, file, formData) {
    if (!factura?.idArrendamiento || !factura?.idCobro) {
      throw new Error('Factura invalida para registrar comprobante');
    }

    const upload = await uploadToCloudinary(file, { folder: 'inmotech/comprobantes' });

    const payload = {
      url_comprobante: upload.url,
      entidad_bancaria: formData.entidadBancaria,
      referencia_bancaria: formData.referenciaBancaria,
      monto_pagado: toNumber(formData.montoPagado || factura.valorPago),
      fecha_pago: formData.fechaPago,
      estado: 'En revisión',
      observaciones: formData.observaciones || ''
    };

    const response = await apiClient.post(
      `/leases/${factura.idArrendamiento}/payments/${factura.idCobro}/receipt`,
      payload
    );

    return response?.data || response;
  }
}

export default new TenantPortalApiService();
