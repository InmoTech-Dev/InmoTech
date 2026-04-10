/*  */import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  X,
  Paperclip,
  UploadCloud,
  Wallet,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { ImageViewer } from "../../../../shared/components/ui/ImageViewer";
import { toast } from "../../../../shared/hooks/use-toast";
import { downloadFile } from "../../../../shared/utils/downloadFile";

const formatCurrency = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0";
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
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

  const isFinalizedLease = statusRent.estado === "Finalizado";

  const [activePage, setActivePage] = useState(isFinalizedLease ? "payments" : "tracking");
  const [paymentsTab, setPaymentsTab] = useState("current");
  const [viewer, setViewer] = useState({ isOpen: false, index: 0, items: [] });
  const [pdfViewer, setPdfViewer] = useState({ isOpen: false, url: "", name: "" });

  const paymentGroups = useMemo(() => {
    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.fecha_cobro) - new Date(b.fecha_cobro)
    );
    const paidPayments = sortedPayments.filter(
      (payment) => payment.comprobante || payment.estado === "Pagado"
    );
    const unpaidPayments = sortedPayments.filter(
      (payment) => !payment.comprobante && payment.estado !== "Pagado"
    );
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;
    const overduePayment =
      unpaidPayments.find((payment) => String(payment.fecha_cobro || "").slice(0, 10) <= todayStr) ||
      null;
    const currentMonthPayment =
      overduePayment ||
      unpaidPayments.find((payment) => String(payment.fecha_cobro || "").slice(0, 7) === currentMonth) ||
      unpaidPayments[0] ||
      null;

    return {
      currentPayment: currentMonthPayment ? [currentMonthPayment] : [],
      paidPayments,
    };
  }, [payments]);

  const hasPendingPayments = useMemo(
    () => payments.some((payment) => payment?.estado !== "Pagado" && !payment?.comprobante),
    [payments]
  );
  const hasOverduePayments = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    return payments.some(
      (payment) =>
        payment?.estado !== "Pagado" &&
        !payment?.comprobante &&
        String(payment?.fecha_cobro || "").slice(0, 10) <= todayStr
    );
  }, [payments]);

  const canFinalizeLease = !hasPendingPayments;

  const handleEstadoChange = (nextEstado) => {
    if (nextEstado === "Debe" && !hasOverduePayments) {
      toast({
        title: "Arriendo al dia",
        description: "El arriendo esta al dia, por eso no se puede cambiar el estado a Debe.",
        variant: "destructive",
      });
      return;
    }

    onChangeEstado(nextEstado);
  };

  useEffect(() => {
    if (isFinalizedLease) {
      setActivePage("payments");
    }
  }, [isFinalizedLease]);

  const existingReceipts = useMemo(
    () =>
      payments
        .filter((payment) => payment?.comprobante?.url_comprobante)
        .map((payment) => ({
          id: payment.comprobante.id_comprobante || payment.id_cobro || payment.id,
          paymentId: payment.id_cobro || payment.id,
          url: payment.comprobante.url_comprobante,
          downloadUrl: payment.comprobante.url_comprobante,
          name: `Comprobante ${String(payment.fecha_cobro || "").slice(0, 10) || payment.id_cobro || ""}`,
          fechaCobro: payment.fecha_cobro,
          fechaPago: payment.comprobante.fecha_pago,
          monto: payment.comprobante.monto_pagado || payment.valor_pago,
          estado: payment.comprobante.estado,
        })),
    [payments]
  );

  const imageReceipts = useMemo(
    () =>
      existingReceipts.filter((receipt) =>
        (receipt.url || "").toLowerCase().match(/(image\/|\.png$|\.jpe?g$|\.webp$|\.jfif$)/)
      ),
    [existingReceipts]
  );

  const openImageViewer = (index) => {
    setViewer({ isOpen: true, index, items: imageReceipts });
  };

  const openPdfViewer = (url, name) => {
    setPdfViewer({ isOpen: true, url, name });
  };

  const handleDownloadReceipt = async (url, fileName) => {
    if (!url) return;

    try {
      await downloadFile(url, fileName);
    } catch (_error) {
      window.open(url, "_blank", "noopener");
    }
  };

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

    const hasReceipt = Boolean(payment?.comprobante);
    const receiptId = payment?.comprobante?.id_comprobante || payment?.id_cobro || payment?.id;
    const receiptUrl = payment?.comprobante?.url_comprobante || "";
    const isPdfReceipt =
      receiptUrl.toLowerCase().includes(".pdf") || receiptUrl.toLowerCase().includes("application/pdf");
    const imageIndex = imageReceipts.findIndex((item) => item.id === receiptId);
    const [expanded, setExpanded] = useState(false);
    const [file, setFile] = useState(null);
    const [form, setForm] = useState({
      entidad_bancaria: payment?.comprobante?.entidad_bancaria || "",
      referencia_bancaria: payment?.comprobante?.referencia_bancaria || "",
      monto_pagado: formatThousands(payment?.comprobante?.monto_pagado || payment?.valor_pago || ""),
      fecha_pago: payment?.comprobante?.fecha_pago || payment?.fecha_cobro || "",
    });

    React.useEffect(() => {
      if (!hasReceipt) return;
      setForm({
        entidad_bancaria: payment.comprobante.entidad_bancaria || "",
        referencia_bancaria: payment.comprobante.referencia_bancaria || "",
        monto_pagado: formatThousands(payment.comprobante.monto_pagado || ""),
        fecha_pago: payment.comprobante.fecha_pago || "",
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
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-start justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-3">
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
              </span>
            ) : (
              <span className="text-xs text-amber-700">Sin comprobante</span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 mt-1 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""
              }`}
          />
        </button>

        {expanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                placeholder="No. documento"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Monto pagado *</label>
              <input
                name="monto_pagado"
                value={form.monto_pagado}
                readOnly
                className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
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
            {hasReceipt && receiptUrl && (
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    if (isPdfReceipt || imageIndex === -1) {
                      openPdfViewer(receiptUrl, `Comprobante ${payment.fecha_cobro || payment.id_cobro || ""}`);
                      return;
                    }
                    openImageViewer(imageIndex);
                  }}
                >
                  Ver comprobante
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    handleDownloadReceipt(
                      receiptUrl,
                      `Comprobante ${String(payment.fecha_cobro || payment.id_cobro || payment.id || "").slice(0, 10) || "arriendo"}`
                    )
                  }
                >
                  Descargar
                </button>
              </div>
            )}
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
        )}
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
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="px-4 sm:px-5 py-3 flex items-start justify-between gap-3">
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

          <div className="px-4 sm:px-5 pb-2.5">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {!isFinalizedLease && (
                <button
                  type="button"
                  onClick={() => setActivePage("tracking")}
                  className={`px-3 py-2 text-sm rounded-lg transition ${activePage === "tracking"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Seguimiento
                </button>
              )}
              <button
                type="button"
                onClick={() => setActivePage("payments")}
                className={`px-3 py-2 text-sm rounded-lg transition ${activePage === "payments"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Pagos
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-4 sm:px-5 py-3 space-y-3">
          {activePage === "tracking" && !isFinalizedLease && (
            <>
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Resumen</h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start">
                  <div className="space-y-1.5">
                    <Field
                      label="Arrendatario"
                      value={`${statusRent.primerNombreArrendatario || ""} ${statusRent.primerApellidoArrendatario || ""}`.trim() || "-"}
                    />
                    <Field
                      label="Inmueble"
                      value={`${statusRent.tipoInmueble || "-"}${statusRent.registroInmobiliario ? ` - ${statusRent.registroInmobiliario}` : ""
                        }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                    <Field label="Inicio" value={statusRent.fechaInicio || "-"} />
                    <Field label="Fin" value={statusRent.fechaFinal || "-"} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Cambio de estado</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">
                      Estado del arriendo
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={statusRent.nuevoEstado}
                      onChange={(e) => handleEstadoChange(e.target.value)}
                    >
                      {estados.map((estado) => (
                        <option
                          key={estado}
                          value={estado}
                          disabled={estado === "Finalizado" && !canFinalizeLease}
                        >
                          {estado}
                        </option>
                      ))}
                    </select>
                    {statusRent.nuevoEstado === "Finalizado" && !canFinalizeLease && (
                      <p className="mt-1 text-xs text-red-500">
                        Solo puedes cambiar a Finalizado cuando todos los pagos esten realizados.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500">
                      Descripcion (opcional)
                    </label>
                    <textarea
                      rows={3}
                      className="mt-1 w-full min-h-[72px] rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                      placeholder="Ej: Pago recibido, se cambia a 'Al dia'"
                      value={statusRent.comentario}
                      onChange={(e) => onChangeComentario(e.target.value)}
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {activePage === "payments" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
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

              {payments.length > 0 && (
                <>
                  <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setPaymentsTab("current")}
                      className={`px-3 py-2 text-sm rounded-lg transition ${paymentsTab === "current"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      Pago del mes
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentsTab("history")}
                      className={`px-3 py-2 text-sm rounded-lg transition ${paymentsTab === "history"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      Pagos realizados
                    </button>
                  </div>

                  {paymentsTab === "current" && (
                    <div className="space-y-3">
                      {paymentGroups.currentPayment.length > 0 ? (
                        paymentGroups.currentPayment.map((payment) => (
                          <ReceiptRow key={payment.id_cobro || payment.id} payment={payment} />
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No hay una cuota pendiente para este mes.
                        </p>
                      )}
                    </div>
                  )}

                  {paymentsTab === "history" && (
                    <div className="space-y-3">
                      {paymentGroups.paidPayments.length > 0 ? (
                        paymentGroups.paidPayments.map((payment) => (
                          <ReceiptRow key={payment.id_cobro || payment.id} payment={payment} />
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">Aun no hay pagos registrados.</p>
                      )}
                    </div>
                  )}

                </>
              )}
            </section>
          )}
        </div>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 sm:px-5 py-2.5 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition text-sm"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          {!isFinalizedLease && (
            <button
              className={`px-5 py-2 rounded-xl text-white font-semibold shadow-sm transition text-sm ${statusRent.nuevoEstado === "Finalizado" && !canFinalizeLease
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
              onClick={onSave}
              disabled={statusRent.nuevoEstado === "Finalizado" && !canFinalizeLease}
              title={
                statusRent.nuevoEstado === "Finalizado" && !canFinalizeLease
                  ? "Debes completar todos los pagos antes de finalizar el arriendo."
                  : undefined
              }
              aria-disabled={statusRent.nuevoEstado === "Finalizado" && !canFinalizeLease}
              type="button"
            >
              Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    <>
      {modal}
      <ImageViewer
        isOpen={viewer.isOpen}
        onClose={() => setViewer((prev) => ({ ...prev, isOpen: false }))}
        images={viewer.items}
        currentIndex={viewer.index}
        onIndexChange={(index) => setViewer((prev) => ({ ...prev, index }))}
      />
      {pdfViewer.isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={() => setPdfViewer({ isOpen: false, url: "", name: "" })}
        >
          <div
            className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
              <span className="truncate text-sm font-semibold text-gray-800">
                {pdfViewer.name || "Documento PDF"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => window.open(pdfViewer.url, "_blank", "noopener")}
                >
                  Abrir en nueva pestana
                </button>
                <button
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  onClick={() => setPdfViewer({ isOpen: false, url: "", name: "" })}
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe
                title={pdfViewer.name || "PDF"}
                src={pdfViewer.url}
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>,
    document.getElementById("modal-root") || document.body
  );
}