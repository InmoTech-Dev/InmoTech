import React, { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ventaApiService } from "../../../../shared/services/ventaApiService";

/**
 * Modal de seguimiento / cambio de estado de venta.
 * Usa el catalogo de estados entregado por la API (Estados_venta).
 */
export default function PurchaseTrackingModal({
  venta,
  statusOptions = [],
  onClose,
  onUpdate,
}) {
  if (!venta) return null;

  const statusList = useMemo(() => {
    if (!Array.isArray(statusOptions)) return [];
    return [...statusOptions]
      .filter(Boolean)
      .sort(
        (a, b) =>
          (a.orden ?? a.id_estado_venta ?? 0) -
          (b.orden ?? b.id_estado_venta ?? 0)
      );
  }, [statusOptions]);

  const normalize = (value = "") =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const findStatusId = (name) => {
    const target = normalize(name);
    const found = statusList.find((s) => normalize(s.nombre_estado) === target);
    return found?.id_estado_venta ?? statusList[0]?.id_estado_venta ?? null;
  };

  const displayStatusName = (id) =>
    statusList.find((s) => Number(s.id_estado_venta) === Number(id))
      ?.nombre_estado || "Sin estado";

  const initialEstadoId =
    venta.id_estado_venta ||
    venta.estadoSeguimientoId ||
    findStatusId(venta.estadoSeguimiento || venta.estado || "");

  const [estadoId, setEstadoId] = useState(initialEstadoId);

  const cleanDescription = (text) => {
    if (!text) return "";
    const trimmed = String(text).trim();
    const match = trimmed.match(/^\[[^\]]*?\]\s*(.*)$/);
    const body = match ? match[1].trim() : trimmed;
    return body;
  };

  const [descripcion, setDescripcion] = useState(
    cleanDescription(venta.descripcionSeguimiento || venta.descripcion_seguimiento || "")
  );
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState({ comprobante: null, contrato: null });

  const [adjuntos, setAdjuntos] = useState(Array.isArray(venta.adjuntos) ? venta.adjuntos : []);

  // Refrescar adjuntos al abrir modal / cambiar venta para que el cierre persista tras recarga
  useEffect(() => {
    const load = async () => {
      const id = venta.id_venta || venta.id;
      if (!id) return;
      try {
        const resp = await ventaApiService.listarAdjuntos(id);
        const list = resp?.data || resp?.data?.data || resp || [];
        if (Array.isArray(list)) setAdjuntos(list);
      } catch {
        setAdjuntos(Array.isArray(venta.adjuntos) ? venta.adjuntos : []);
      }
    };
    load();
  }, [venta]);

  const existingAdjuntos = adjuntos;
  const hasComprobante = existingAdjuntos.some((a) => (a.tipo || "").toLowerCase() === "comprobante");
  const hasContrato = existingAdjuntos.some((a) => (a.tipo || "").toLowerCase() === "contrato");
  const statusNorm = (venta.estado_seguimiento || venta.estado || "").toString().trim().toLowerCase();
  const isClosed = (statusNorm === "completada" || statusNorm === "finalizada") && hasComprobante && hasContrato;

  const handleFileChange = (tipo, event) => {
    const file = event.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [tipo]: file }));
  };

  const uploadSelectedAttachments = async (ventaId) => {
    const tasks = [];
    if (files.comprobante) {
      tasks.push(ventaApiService.subirAdjunto(ventaId, files.comprobante, "comprobante"));
    }
    if (files.contrato) {
      tasks.push(ventaApiService.subirAdjunto(ventaId, files.contrato, "contrato"));
    }
    if (tasks.length) {
      await Promise.all(tasks);
    }
    // Obtener lista actualizada desde el backend para reflejarla al guardar
    const resp = await ventaApiService.listarAdjuntos(ventaId);
    const adjuntos = resp?.data || resp?.data?.data || resp || [];
    return Array.isArray(adjuntos) ? adjuntos : [];
  };

  const handleSave = async () => {
    setSaving(true);
    const resolvedEstadoId =
      estadoId ||
      statusList[0]?.id_estado_venta ||
      findStatusId("En espera") ||
      3;

    const basePayload = {
      ...venta,
      id: venta.id || venta.id_venta,
      id_venta: venta.id_venta || venta.id,
      id_estado_venta: resolvedEstadoId,
      estado: displayStatusName(resolvedEstadoId),
      estadoSeguimiento: displayStatusName(resolvedEstadoId),
      descripcionSeguimiento: descripcion,
    };

    try {
      // Subir adjuntos (si el usuario seleccionó) y refrescar lista
      if (files.comprobante || files.contrato) {
        const nuevosAdjuntos = await uploadSelectedAttachments(basePayload.id_venta);
        basePayload.adjuntos = nuevosAdjuntos;
        setAdjuntos(nuevosAdjuntos);
      }

      await onUpdate(basePayload);
      if (
        (basePayload.estado || basePayload.estado_seguimiento || "").toString().toLowerCase() === "completada" &&
        (basePayload.adjuntos || []).some((a) => (a.tipo || "").toLowerCase() === "comprobante") &&
        (basePayload.adjuntos || []).some((a) => (a.tipo || "").toLowerCase() === "contrato")
      ) {
        alert("Venta cerrada: estado completada con comprobante y contrato cargados.");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const buyerName =
    venta.comprador || venta.cliente || venta.arrendatario || "N/A";

  const propertyLabel =
    venta.inmueble || venta.propiedad || venta.registro || venta.tipo || "N/A";

  const priceLabel = venta.valor || venta.precio || venta.monto || "N/A";

  const paymentType =
    venta.medioPago ||
    venta.medio_pago ||
    venta.medioPagoDescripcion ||
    venta.medio_pago_descripcion ||
    venta.descripcion_pago ||
    "N/A";

  return (
    <AnimatePresence>
      {venta && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm z-50 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-5 right-5 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.button>

        <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-1">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Seguimiento de la Venta
            </h2>
            <p className="text-sm text-gray-600">
              Cambia unicamente el estado de la venta. Los demas datos son de
              solo lectura.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="font-semibold text-gray-700">Comprador:</p>
              <p className="text-gray-900">{buyerName}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Inmueble:</p>
              <p className="text-gray-900">{propertyLabel}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Precio de venta:</p>
              <p className="text-gray-900">{priceLabel}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Tipo de pago:</p>
              <p className="text-gray-900">{paymentType}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-800 mb-1">
                Estado de la venta
              </label>
              <select
                value={estadoId ?? ""}
                disabled={!statusList.length || isClosed}
                onChange={(e) => setEstadoId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {statusList.length === 0 && (
                  <option value="">Cargando estados...</option>
                )}
                {statusList.map((opt) => (
                  <option key={opt.id_estado_venta} value={opt.id_estado_venta}>
                    {opt.nombre_estado}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-gray-800 mb-1">
                Descripcion (opcional)
              </label>
              <textarea
                className="w-full min-h-[110px] rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                placeholder="Ej: Pago recibido, se cambia a 'Al dia'"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={isClosed}
              />
            </div>

            {/* Adjuntos deshabilitados: el backend no acepta multipart ni /attachments */}
            <div className="mt-2 space-y-3">
              <p className="font-semibold text-gray-800">Adjuntar documentos</p>
              <div className="grid grid-cols-1 gap-3">
                <label className="flex flex-col border border-dashed border-gray-300 rounded-lg p-3 text-sm cursor-pointer hover:border-blue-500">
                  <span className="font-medium text-gray-700">Comprobante de pago (PDF/imagen)</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="mt-2 text-sm"
                    onChange={(e) => handleFileChange("comprobante", e)}
                    disabled={isClosed}
                  />
                </label>
                <label className="flex flex-col border border-dashed border-gray-300 rounded-lg p-3 text-sm cursor-pointer hover:border-blue-500">
                  <span className="font-medium text-gray-700">Contrato de venta (PDF/imagen)</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="mt-2 text-sm"
                    onChange={(e) => handleFileChange("contrato", e)}
                    disabled={isClosed}
                  />
                </label>
              </div>

              {existingAdjuntos.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Adjuntos existentes</p>
                  <ul className="space-y-2">
                    {existingAdjuntos.map((adj) => (
                      <li key={adj.id_adjunto} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800">
                          {adj.tipo.toUpperCase()} — {adj.nombre_archivo}
                        </span>
                        <a
                          href={adj.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Ver
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center gap-3">
            {isClosed && (
              <p className="text-sm text-green-700 font-semibold">
                Venta cerrada: estado completada y documentos cargados.
              </p>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-60"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving || isClosed}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar estado"}
            </motion.button>
          </div> 
        </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
