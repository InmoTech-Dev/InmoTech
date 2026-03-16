import { useEffect, useMemo, useState } from 'react';
import { Loader2, UploadCloud, ReceiptText } from 'lucide-react';
import tenantPortalApiService from '../../../../shared/services/tenantPortalApiService';

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CO');
};

export default function TenantInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [uploadStateByInvoice, setUploadStateByInvoice] = useState({});

  const pendingInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.estado !== 'Pagado'),
    [invoices]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await tenantPortalApiService.getMyBillingSummary();
      setSummary(data?.resumen || null);
      setInvoices(Array.isArray(data?.facturas) ? data.facturas : []);
    } catch (loadError) {
      setError(loadError?.message || 'No se pudieron cargar tus facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (invoiceId, file) => {
    if (!file) return;
    setUploadStateByInvoice((prev) => ({
      ...prev,
      [invoiceId]: {
        ...(prev[invoiceId] || {}),
        file
      }
    }));
  };

  const handleTextChange = (invoiceId, key, value) => {
    setUploadStateByInvoice((prev) => ({
      ...prev,
      [invoiceId]: {
        ...(prev[invoiceId] || {}),
        [key]: value
      }
    }));
  };

  const handleUpload = async (invoice) => {
    const current = uploadStateByInvoice[invoice.idCobro] || {};
    if (!current.file) return;

    try {
      setSubmittingId(invoice.idCobro);
      await tenantPortalApiService.uploadPaymentReceipt(invoice, current.file, {
        entidadBancaria: current.entidadBancaria || '',
        referenciaBancaria: current.referenciaBancaria || '',
        montoPagado: current.montoPagado || invoice.valorPago,
        fechaPago: current.fechaPago || new Date().toISOString().slice(0, 10),
        observaciones: current.observaciones || ''
      });
      await loadData();
    } catch (uploadError) {
      setError(uploadError?.message || 'No fue posible subir el comprobante');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-slate-900">Mis facturas</h1>
        <p className="text-sm text-slate-600 mt-1">
          Revisa tus cobros y sube tus comprobantes de pago.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 uppercase">Pendientes</p>
          <p className="text-2xl font-semibold text-slate-900">{summary?.facturasPendientes || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 uppercase">Pagadas</p>
          <p className="text-2xl font-semibold text-slate-900">{summary?.facturasPagadas || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500 uppercase">Total pendiente</p>
          <p className="text-2xl font-semibold text-slate-900">{formatCurrency(summary?.totalPendiente || 0)}</p>
        </div>
      </div>

      {pendingInvoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No tienes facturas pendientes por ahora.
        </div>
      ) : (
        pendingInvoices.map((invoice) => {
          const uploadData = uploadStateByInvoice[invoice.idCobro] || {};
          return (
            <div key={invoice.idCobro} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">{invoice.inmueble?.titulo || 'Inmueble'}</p>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(invoice.valorPago)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Fecha cobro: {formatDate(invoice.fechaCobro)} | Limite: {formatDate(invoice.fechaLimite)}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {invoice.estado}
                </span>
              </div>

              {invoice.comprobante?.url ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
                  <ReceiptText className="h-4 w-4" />
                  Comprobante enviado ({invoice.comprobante.estado || 'En revision'})
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Entidad bancaria"
                    value={uploadData.entidadBancaria || ''}
                    onChange={(event) => handleTextChange(invoice.idCobro, 'entidadBancaria', event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Referencia bancaria"
                    value={uploadData.referenciaBancaria || ''}
                    onChange={(event) => handleTextChange(invoice.idCobro, 'referenciaBancaria', event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Monto pagado"
                    value={uploadData.montoPagado || ''}
                    onChange={(event) => handleTextChange(invoice.idCobro, 'montoPagado', event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={uploadData.fechaPago || ''}
                    onChange={(event) => handleTextChange(invoice.idCobro, 'fechaPago', event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    placeholder="Observaciones (opcional)"
                    value={uploadData.observaciones || ''}
                    onChange={(event) => handleTextChange(invoice.idCobro, 'observaciones', event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                    rows={2}
                  />
                  <label className="md:col-span-2 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 cursor-pointer">
                    <UploadCloud className="h-4 w-4" />
                    {uploadData.file?.name || 'Seleccionar comprobante'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(event) => handleFileChange(invoice.idCobro, event.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleUpload(invoice)}
                    disabled={!uploadData.file || submittingId === invoice.idCobro}
                    className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submittingId === invoice.idCobro && <Loader2 className="h-4 w-4 animate-spin" />}
                    Subir comprobante
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
