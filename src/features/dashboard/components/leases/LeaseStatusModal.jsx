import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { X, Paperclip, UploadCloud, Wallet, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";

const formatCurrency = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
};

export default function LeaseStatusModal({
  statusRent,
  estados = [],
  onClose,
  onChangeEstado,
  onChangeComentario,
  onSave,
  payments = [],
  loadingPayments = false,
  onUploadReceipt,
  uploadingPaymentId = null,
}) {
  if (!statusRent) return null;

  const Field = ({ label, value, className = "" }) => {
    const v = value ?? "";
    const empty = v === "" || v === "-" || v === null || v === undefined;
    return (
      <div className={`min-w-0 ${className}`}>
        <p className="text-[11px] font-semibold text-gray-500">{label}</p>
        <p className={`mt-0.5 text-sm break-words ${empty ? "text-gray-400" : "text-gray-900"}`}>
          {empty ? "-" : v}
        </p>
      </div>
    );
  };

  const ReceiptRow = ({ payment }) => {
    const formatThousands = (raw) => {
      const digits = String(raw ?? "").replace(/\D+/g, "");
      if (!digits) return "";
      return Number(digits).toLocaleString("es-CO");
    };

    const parseNumber = (raw) => {
      const digits = String(raw ?? "").replace(/[^\d.-]/g, "");
      return digits ? Number(digits) : 0;
    };

    const [file, setFile] = useState(null);
    const [form, setForm] = useState({
      entidad_bancaria: payment?.comprobante?.entidad_bancaria || "",
      referencia_bancaria: payment?.comprobante?.referencia_bancaria || "",
      monto_pagado: formatThousands(payment?.comprobante?.monto_pagado || payment?.valor_pago || ""),
      fecha_pago: payment?.comprobante?.fecha_pago || payment?.fecha_cobro || "",
      observaciones: payment?.comprobante?.observaciones || "",
    });

    // Sincroniza el formulario cuando llega un comprobante desde el backend
    const hasReceipt = Boolean(payment?.comprobante);
    React.useEffect(() => {
      if (!hasReceipt) return;
      setForm({
        entidad_bancaria: payment.comprobante.entidad_bancaria || "",
        referencia_bancaria: payment.comprobante.referencia_bancaria || "",
        monto_pagado: formatThousands(payment.comprobante.monto_pagado || ""),
        fecha_pago: payment.comprobante.fecha_pago || "",
        observaciones: payment.comprobante.observaciones || "",
      });
    }, [hasReceipt, payment?.comprobante]);

    const disabled = hasReceipt || uploadingPaymentId === payment.id_cobro || !file;

    const handleChange = (e) => {
      const { name, value } = e.target;
      if (name === "monto_pagado") {
        setForm((prev) => ({ ...prev, [name]: formatThousands(value) }));
        return;
      }
      setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
      if (!onUploadReceipt) return;
      const cleanedMonto = parseNumber(form.monto_pagado);
      onUploadReceipt(payment, file, { ...form, monto_pagado: cleanedMonto });
    };

    return (
      <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span>{formatCurrency(payment.valor_pago)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Fecha cobro: {payment.fecha_cobro}</span>
          </div>
          <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">
            {payment.estado}
          </span>
          {payment.comprobante ? (
            <span className="flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Comprobante cargado</span>
              {payment.comprobante.url_comprobante && (
                <a
                  href={payment.comprobante.url_comprobante}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline hover:text-blue-800"
                >
                  Ver
                </a>
              )}
            </span>
          ) : (
            <span className="text-xs text-amber-700">Sin comprobante</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600">Entidad bancaria *</label>
            <input
              name="entidad_bancaria"
              value={form.entidad_bancaria}
              onChange={handleChange}
              readOnly={hasReceipt}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              placeholder="Ej: Bancolombia"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600">Referencia *</label>
            <input
              name="referencia_bancaria"
              value={form.referencia_bancaria}
              onChange={handleChange}
              readOnly={hasReceipt}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              placeholder="No. de transacción"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600">Monto pagado *</label>
            <input
              name="monto_pagado"
              value={form.monto_pagado}
              onChange={handleChange}
              readOnly={hasReceipt}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              placeholder="Ej: 1500000"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600">Fecha de pago *</label>
            <input
              type="date"
              name="fecha_pago"
              value={form.fecha_pago}
              onChange={handleChange}
              readOnly={hasReceipt}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col">
            <label className="text-xs font-semibold text-slate-600">Observaciones</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              readOnly={hasReceipt}
              rows={2}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              placeholder="Comentario opcional"
            />
          </div>
          {!hasReceipt && (
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Paperclip className="w-4 h-4" /> Comprobante (imagen/pdf) *
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPaymentId === payment.id_cobro ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Subir comprobante
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER STICKY */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Seguimiento de Arriendo
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Cambia el estado y adjunta comprobantes de pago.
              </p>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 text-gray-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition"
              aria-label="Cerrar"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY SCROLL */}
        <div className="max-h-[72vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {/* RESUMEN */}
          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Resumen</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <Field
                label="Arrendatario"
                value={`${statusRent.primerNombreArrendatario || ""} ${statusRent.primerApellidoArrendatario || ""}`.trim() || "-"}
                className="sm:col-span-2"
              />
              <Field
                label="Inmueble"
                value={`${statusRent.tipoInmueble || "-"}${statusRent.registroInmobiliario ? ` · ${statusRent.registroInmobiliario}` : ""}`}
                className="sm:col-span-2"
              />
              <Field label="Inicio" value={statusRent.fechaInicio || "-"} />
              <Field label="Fin" value={statusRent.fechaFinal || "-"} />
            </div>
          </section>

          {/* FORM ESTADO */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Cambio de estado</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Estado del arriendo
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  value={statusRent.nuevoEstado}
                  onChange={(e) => onChangeEstado(e.target.value)}
                >
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Descripción (opcional)
                </label>
                <textarea
                  className="mt-1 w-full min-h-[100px] rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                  placeholder="Ej: Pago recibido, se cambia a 'Al día'"
                  value={statusRent.comentario}
                  onChange={(e) => onChangeComentario(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* PAGOS Y COMPROBANTES */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Cobros y comprobantes</h3>
              {loadingPayments && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando cobros...
                </div>
              )}
            </div>

            {(!payments || payments.length === 0) && !loadingPayments && (
              <p className="text-sm text-slate-500">No hay cobros generados para este arriendo.</p>
            )}

            <div className="space-y-3">
              {payments.map((payment) => (
                <ReceiptRow key={payment.id_cobro || payment.id} payment={payment} />
              ))}
            </div>
          </section>
        </div>

        {/* FOOTER STICKY */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 sm:px-5 py-3 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition text-sm"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition text-sm"
            onClick={onSave}
            type="button"
          >
            Guardar estado
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById("modal-root") || document.body);
}
