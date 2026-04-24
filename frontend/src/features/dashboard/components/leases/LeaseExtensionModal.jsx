import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function LeaseExtensionModal({
  rent,
  applyingExtension,
  onClose,
  onToggleApply,
  onChangeComment,
  onApply,
}) {
  if (!rent) return null;

  const nombre =
    `${rent.primerNombreArrendatario || ""} ${rent.primerApellidoArrendatario || ""}`.trim() ||
    "este arriendo";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Prorroga del contrato</h3>
            <p className="mt-0.5 text-xs text-slate-600">{nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Periodo del contrato</p>
            <div className="mt-3 space-y-1.5 text-sm text-slate-800">
              <p>
                Inicio: <span className="font-semibold">{rent.currentStartDate}</span>
              </p>
              <p>
                Fin actual: <span className="font-semibold">{rent.currentEndDate}</span>
              </p>
              <p>
                Nueva fecha: <span className="font-semibold">{rent.extendedEndDate}</span>
              </p>
            </div>
            <p className="mt-3 text-sm text-violet-700">
              Se aplicarán <span className="font-semibold">{rent.durationMonths}</span>{" "}
              {rent.durationMonths === 1 ? "mes" : "meses"} de prórroga.
            </p>
          </div>

          <label
            className={`block rounded-2xl border px-4 py-3 transition-colors ${
              rent.applyExtension ? "border-violet-300 bg-violet-50" : "border-violet-200 bg-violet-50/70"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                checked={Boolean(rent.applyExtension)}
                onChange={(e) => onToggleApply?.(e.target.checked)}
                disabled={applyingExtension}
              />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-4 text-violet-950">Aplicar prorroga</p>
                <p className="mt-0.5 text-[12px] leading-4 text-violet-800">
                  Esto actualiza la fecha final del contrato y genera los cobros del periodo prorrogado.
                </p>
              </div>
            </div>
          </label>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripcion</label>
            <textarea
              value={rent.extensionComment || ""}
              onChange={(e) => onChangeComment?.(e.target.value)}
              placeholder="Escribe una descripcion para la prorroga (opcional)"
              disabled={applyingExtension}
              rows={3}
              className="mt-1 min-h-[84px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm text-slate-900 shadow-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/90 px-5 py-4">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[100px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={applyingExtension}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={!rent.applyExtension || applyingExtension}
              className="min-w-[148px] rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {applyingExtension ? "Aplicando..." : "Guardar prorroga"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
