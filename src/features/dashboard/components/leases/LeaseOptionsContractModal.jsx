import React from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { Calendar, AlertCircle, Wrench, X } from "lucide-react";
import { FaDollarSign } from "react-icons/fa";

export default function LeaseOptionsContractModal({
  rent,
  onClose,
  onOpenExtension,
  onOpenAdjustment,
  onOpenPreNotice,
}) {
  if (!rent) return null;

  const isFinalizedLease = rent.estado === "Finalizado";
  const nombre =
    `${rent.primerNombreArrendatario || ""} ${rent.primerApellidoArrendatario || ""}`.trim() ||
    "este arriendo";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Opciones del contrato</h3>
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

        <div className="space-y-3 px-5 py-5">
          <button
            type="button"
            onClick={() => {
              if (isFinalizedLease) return;
              onOpenExtension?.(rent);
            }}
            disabled={isFinalizedLease}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left transition ${
              isFinalizedLease
                ? "cursor-not-allowed border border-slate-200 bg-slate-100"
                : "border border-violet-200 bg-violet-50 hover:bg-violet-100"
            }`}
          >
            <Calendar className={`h-5 w-5 ${isFinalizedLease ? "text-slate-400" : "text-violet-700"}`} />
            <div>
              <p className="text-sm font-semibold text-slate-900">Prorroga</p>
              <p className="text-xs text-slate-600">
                {isFinalizedLease
                  ? "No disponible porque el arriendo ya esta finalizado."
                  : "Extender la fecha final del contrato."}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isFinalizedLease) return;
              onOpenAdjustment?.(rent);
            }}
            disabled={isFinalizedLease}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left transition ${
              isFinalizedLease
                ? "cursor-not-allowed border border-slate-200 bg-slate-100"
                : "border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <FaDollarSign className={`h-5 w-5 ${isFinalizedLease ? "text-slate-400" : "text-emerald-700"}`} />
            <div>
              <p className="text-sm font-semibold text-slate-900">Reajuste</p>
              <p className="text-xs text-slate-600">
                {isFinalizedLease
                  ? "No disponible porque el arriendo ya esta finalizado."
                  : "Actualizar el canon anual del contrato."}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenPreNotice?.(rent);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left transition ${
              isFinalizedLease
                ? "border border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "border border-amber-200 bg-amber-50 hover:bg-amber-100"
            }`}
          >
            <AlertCircle className={`h-5 w-5 ${isFinalizedLease ? "text-amber-700" : "text-amber-700"}`} />
            <div>
              <p className="text-sm font-semibold text-slate-900">Preaviso</p>
              <p className="text-xs text-slate-600">
                {isFinalizedLease
                  ? "Consultar historial y soportes de preavisos registrados."
                  : "Registrar aviso de terminacion del contrato."}
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
