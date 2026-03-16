import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function LeasePreNoticeModal({
  rent,
  savingPreNotice,
  onClose,
  onFileChange,
  onChangeObservation,
  onChangeDecision,
  onOpenSupport,
  onSave,
}) {
  if (!rent) return null;

  const isFinalizedLease = rent.estado === "Finalizado";
  const nombre =
    `${rent.primerNombreArrendatario || ""} ${rent.primerApellidoArrendatario || ""}`.trim() ||
    "este arriendo";
  const history = Array.isArray(rent.preNoticeHistory) ? rent.preNoticeHistory : [];
  const hasExistingPreNotice =
    Boolean(rent.existingObservacion?.trim()) ||
    Boolean(rent.existingSoporteUrl) ||
    Boolean(rent.existingFecha) ||
    history.length > 0;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Preaviso del contrato</h3>
            <p className="mt-0.5 text-xs text-slate-600">{nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periodo actual del arriendo</p>
            <p className="mt-1 text-sm text-slate-900">
              Inicio: <span className="font-semibold">{rent.fechaInicio}</span>
            </p>
            <p className="text-sm text-slate-900">
              Fin: <span className="font-semibold">{rent.fechaFinal}</span>
            </p>
          </div>

          {!isFinalizedLease && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Soporte del preaviso</label>
                <label className="mt-1 flex cursor-pointer flex-col rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50/40">
                  <span className="font-medium">Subir captura o foto</span>
                  <span className="mt-1 text-xs text-slate-500">Formatos permitidos: imagen o PDF.</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="mt-3 text-xs"
                    onChange={(e) => onFileChange?.(e.target.files?.[0] || null)}
                    disabled={savingPreNotice}
                  />
                </label>
                {rent.soporte && (
                  <p className="mt-2 text-xs text-slate-500">Archivo seleccionado: {rent.soporte.name}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacion</label>
                <textarea
                  value={rent.observacion}
                  onChange={(e) => onChangeObservation?.(e.target.value)}
                  placeholder="Escribe la observacion del preaviso que entrega el arrendatario."
                  disabled={savingPreNotice}
                  className="mt-1 min-h-[84px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision</label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeDecision?.("Aceptado")}
                    disabled={savingPreNotice}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      rent.decision === "Aceptado"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Aceptado
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeDecision?.("Rechazado")}
                    disabled={savingPreNotice}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      rent.decision === "Rechazado"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Rechazado
                  </button>
                </div>
              </div>
            </>
          )}

          {hasExistingPreNotice && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registro de preavisos</p>
              {history.map((entry, index) => {
                const supportName = `Preaviso ${entry.fecha || index + 1}`.trim();

                return (
                  <div key={entry.id || `${entry.fecha}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Preaviso {history.length - index}
                    </p>
                    {entry.fecha && (
                      <p className="mt-1 text-xs text-slate-500">Fecha: {entry.fecha}</p>
                    )}
                    {entry.observacion && (
                      <p className="mt-1 text-xs text-slate-600">{entry.observacion}</p>
                    )}
                    {entry.decision && (
                      <p className="mt-1 text-xs text-slate-500">
                        Decision: <span className="font-semibold text-slate-700">{entry.decision}</span>
                        {entry.fechaDecision ? ` - ${entry.fechaDecision}` : ""}
                      </p>
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      {entry.urlSoporte && (
                        <button
                          type="button"
                          onClick={() => onOpenSupport?.(entry.urlSoporte, supportName)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Abrir soporte
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            disabled={savingPreNotice}
          >
            Cancelar
          </button>
          {!isFinalizedLease && (
            <button
              type="button"
              onClick={onSave}
              disabled={savingPreNotice || !rent.decision}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {savingPreNotice
                ? "Guardando..."
                : "Registrar preaviso"}
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
