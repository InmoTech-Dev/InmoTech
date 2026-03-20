import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function LeaseAdjustmentModal({
  rent,
  applyingAdjustment,
  formatCurrency,
  onClose,
  onChangeDate,
  onChangeValue,
  onChangeComment,
  onApply,
}) {
  if (!rent) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative flex w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Reajuste de canon</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Actualiza el valor mensual del contrato y los cobros futuros.
            </p>
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

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canon actual</p>
            <p className="mt-1 text-sm text-slate-900">
              <span className="font-semibold">{rent.valorMensual}</span>
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha sugerida</p>
            <p className="mt-1 text-sm text-slate-900">
              <span className="font-semibold">{rent.adjustmentDate}</span>
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha del reajuste *</label>
            <input
              type="date"
              value={rent.adjustmentDate || ""}
              onChange={(e) => onChangeDate?.(e.target.value)}
              disabled={applyingAdjustment}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nuevo canon mensual *</label>
            <input
              type="text"
              value={rent.newMonthlyValue || ""}
              onChange={(e) => onChangeValue?.(String(e.target.value || "").replace(/\D+/g, ""))}
              disabled={applyingAdjustment}
              placeholder="Ej: 3200000"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <p className="mt-1 text-xs text-slate-500">Valor formateado: {formatCurrency(rent.newMonthlyValue || 0)}</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripcion</label>
            <textarea
              value={rent.adjustmentComment || ""}
              onChange={(e) => onChangeComment?.(e.target.value)}
              disabled={applyingAdjustment}
              rows={3}
              placeholder="Describe el motivo del reajuste (opcional)"
              className="mt-1 min-h-[84px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            disabled={applyingAdjustment}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={applyingAdjustment}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {applyingAdjustment ? "Aplicando..." : "Guardar reajuste"}
          </button>
        </div>
      </motion.div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
