import React from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const LeaseFinalizeModal = ({
  isOpen = false,
  leaseLabel = "este arriendo",
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
        >
          <motion.div
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 pb-5 pt-6">
              <h3 className="text-lg font-semibold text-slate-900">Confirmar finalizacion</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Al finalizar <span className="font-semibold text-slate-900">{leaseLabel}</span> ya no
                podras hacer prorroga ni mas seguimiento. ¿Deseas continuar?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "Finalizando..." : "Aceptar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById("modal-root") || document.body
  );
};

export default LeaseFinalizeModal;
