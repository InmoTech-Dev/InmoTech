import React, { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import ventaApiService from "../../../../shared/services/ventaApiService";
import { useToast } from "../../../../shared/hooks/use-toast";
import { ImageViewer } from "../../../../shared/components/ui/ImageViewer";

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
  const { toast } = useToast();

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
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const [adjuntos, setAdjuntos] = useState(Array.isArray(venta.adjuntos) ? venta.adjuntos : []);
  const [viewer, setViewer] = useState({ isOpen: false, index: 0, items: [] });
  const [pdfViewer, setPdfViewer] = useState({ isOpen: false, url: "", name: "" });

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
  const imageAdjuntos = existingAdjuntos.filter((a) =>
    (a.mime_type || a.url || "").toLowerCase().match(/(image\/|\.png$|\.jpe?g$|\.webp$|\.jfif$)/)
  );
  const buildImageItems = () =>
    imageAdjuntos.map((a) => ({
      url: a.url,
      name: a.nombre_archivo || a.filename || a.url?.split("/").pop(),
    }));
  const hasComprobante = existingAdjuntos.some((a) => (a.tipo || "").toLowerCase() === "comprobante");
  const hasContrato = existingAdjuntos.some((a) => (a.tipo || "").toLowerCase() === "contrato");
  const statusNorm = (venta.estado_seguimiento || venta.estado || "").toString().trim().toLowerCase();
  const isClosed = (statusNorm === "completada" || statusNorm === "finalizada") && hasComprobante && hasContrato;

  const handleFileChange = (tipo, event) => {
    const file = event.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [tipo]: file }));
  };

  const openImageViewer = (index) => {
    setViewer({ isOpen: true, index, items: buildImageItems() });
  };

  const openPdfViewer = (url, name) => {
    setPdfViewer({ isOpen: true, url, name });
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

  const executeSave = async (basePayload) => {
    setSaving(true);

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
        toast({
          title: "Venta cerrada",
          description: "Estado completado y documentos (contrato y comprobante) cargados.",
          variant: "default",
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const resolvedEstadoId =
      estadoId ||
      statusList[0]?.id_estado_venta ||
      findStatusId("En espera") ||
      3;

    const nextEstadoNombre = displayStatusName(resolvedEstadoId);
    const isCompleting =
      (nextEstadoNombre || "").toString().trim().toLowerCase() === "completada";

    const basePayload = {
      ...venta,
      id: venta.id || venta.id_venta,
      id_venta: venta.id_venta || venta.id,
      id_estado_venta: resolvedEstadoId,
      estado: nextEstadoNombre,
      estadoSeguimiento: nextEstadoNombre,
      descripcionSeguimiento: descripcion,
    };

    if (isCompleting && !confirmCloseOpen) {
      setPendingPayload(basePayload);
      setConfirmCloseOpen(true);
      return;
    }

    await executeSave(basePayload);
  };

  const confirmCloseSale = async () => {
    if (!pendingPayload) {
      setConfirmCloseOpen(false);
      return;
    }
    await executeSave(pendingPayload);
    setPendingPayload(null);
    setConfirmCloseOpen(false);
  };

  const cancelCloseSale = () => {
    setConfirmCloseOpen(false);
    setPendingPayload(null);
  };

  const buyerName =
    venta.comprador || venta.cliente || venta.arrendatario || "N/A";

  const show = (v, fb = "N/D") =>
    v === null || v === undefined || v === "" ? fb : v;

  const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "");

  const propertyLabel =
    pick(
      venta.inmueble,
      venta.propiedad,
      venta.inmuebleNombre,
      venta.inmueble_nombre,
      venta.raw?.inmuebleNombre,
      venta.raw?.inmueble_nombre
    ) || "N/A";

  const inmuebleTipo = pick(
    venta.inmuebleTipo,
    venta.tipo,
    venta.raw?.tipo_inmueble,
    venta.raw?.tipo
  );

  const inmuebleRegistro = pick(
    venta.inmuebleRegistro,
    venta.registro,
    venta.raw?.registro_inmobiliario,
    venta.raw?.registro
  );

  const inmuebleArea = pick(
    venta.inmuebleArea,
    venta.raw?.inmueble_area,
    venta.raw?.area,
    venta.area
  );

  const inmuebleHabitaciones = pick(
    venta.inmuebleHabitaciones,
    venta.raw?.inmueble_habitaciones,
    venta.raw?.habitaciones
  );

  const inmuebleBanos = pick(
    venta.inmuebleBanos,
    venta.raw?.inmueble_banos,
    venta.raw?.banos
  );

  const inmuebleDireccion = pick(
    venta.inmuebleDireccion,
    venta.raw?.inmueble_direccion,
    venta.raw?.direccion
  );

  const inmuebleCiudad = pick(
    venta.inmuebleCiudad,
    venta.raw?.inmueble_ciudad,
    venta.raw?.ciudad
  );

  const inmuebleDepartamento = pick(
    venta.inmuebleDepartamento,
    venta.raw?.inmueble_departamento,
    venta.raw?.departamento
  );

  const inmuebleBarrio = pick(
    venta.inmuebleBarrio,
    venta.raw?.inmueble_barrio,
    venta.raw?.barrio
  );

  const priceLabel = venta.valor || venta.precio || venta.monto || "N/A";

  const paymentType =
    venta.medioPago ||
    venta.medio_pago ||
    venta.medioPagoDescripcion ||
    venta.medio_pago_descripcion ||
    venta.descripcion_pago ||
    "N/A";

  return (
    <>
      <AnimatePresence>
        {venta && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.99 }}
              transition={{ duration: 0.2 }}
            >
              {/* HEADER STICKY */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
                <div className="px-5 py-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      Seguimiento de la Venta
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Cambia únicamente el estado. Los demás datos son informativos.
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* BODY SCROLL */}
              <div className="max-h-[72vh] overflow-y-auto px-5 py-4 space-y-4">

                {/* RESUMEN */}
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Resumen de la operación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Comprador</p>
                      <p className="text-gray-900">{buyerName}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Inmueble</p>
                      <p className="text-gray-900">{propertyLabel}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Precio</p>
                      <p className="text-gray-900">{priceLabel}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500">Tipo de pago</p>
                      <p className="text-gray-900">{paymentType}</p>
                    </div>
                  </div>
                </section>

                {/* INMUEBLE DETALLADO */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Inmueble</h3>
                    <div className="flex flex-wrap gap-2">
                      {inmuebleTipo ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          {inmuebleTipo}
                        </span>
                      ) : null}
                      {inmuebleRegistro ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          {inmuebleRegistro}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Área</p>
                      <p className="text-gray-900">{show(inmuebleArea, "-")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Habitaciones</p>
                      <p className="text-gray-900">{show(inmuebleHabitaciones, "-")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Baños</p>
                      <p className="text-gray-900">{show(inmuebleBanos, "-")}</p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-xs font-semibold text-gray-500">Dirección</p>
                      <p className="text-gray-900">{show(inmuebleDireccion, "-")}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Ciudad/Dep</p>
                      <p className="text-gray-900">
                        {show(
                          [inmuebleCiudad, inmuebleDepartamento].filter(Boolean).join(", "),
                          "-"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Barrio</p>
                      <p className="text-gray-900">{show(inmuebleBarrio, "-")}</p>
                    </div>
                  </div>
                </section>

                {/* ESTADO */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Cambio de estado
                  </h3>

                  <div className="space-y-4">

                    <div>
                      <label className="text-xs font-semibold text-gray-500">
                        Estado de la venta
                      </label>

                      <select
                        value={estadoId ?? ""}
                        disabled={!statusList.length || isClosed}
                        onChange={(e) => setEstadoId(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 disabled:bg-gray-100"
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

                    <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Descripción (opcional)
                    </label>

                    <textarea
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900
                                shadow-sm outline-none transition
                                placeholder:text-gray-400
                                focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                                disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="Ej: Pago recibido, se cambia a 'Al día'"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      disabled={isClosed}
                    />
                  </div>
                  </div>
                </section>

                {/* ADJUNTOS */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Adjuntar documentos
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex flex-col border border-dashed border-gray-300 rounded-xl p-3 text-sm cursor-pointer hover:border-blue-500">
                      <span className="font-medium text-gray-700">
                        Comprobante de pago
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="mt-2 text-sm"
                        onChange={(e) => handleFileChange("comprobante", e)}
                        disabled={isClosed}
                      />
                    </label>

                    <label className="flex flex-col border border-dashed border-gray-300 rounded-xl p-3 text-sm cursor-pointer hover:border-blue-500">
                      <span className="font-medium text-gray-700">
                        Contrato de venta
                      </span>
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
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        Adjuntos existentes
                      </p>

                      <ul className="space-y-2 text-sm">
                        {existingAdjuntos.map((adj) => {
                          const isPdf =
                            (adj.mime_type || adj.url || "").toLowerCase().includes("pdf") ||
                            /\.pdf$/i.test(adj.url || "");
                          const imgIndex = imageAdjuntos.findIndex(
                            (a) => a.id_adjunto === adj.id_adjunto
                          );
                          return (
                            <li key={adj.id_adjunto} className="flex justify-between items-center">
                              <span className="text-gray-900">
                                {adj.tipo.toUpperCase()} — {adj.nombre_archivo}
                              </span>
                              <button
                                type="button"
                                className="text-blue-600 hover:underline"
                                onClick={() => {
                                  if (isPdf) {
                                    openPdfViewer(adj.url, adj.nombre_archivo);
                                  } else if (imgIndex >= 0) {
                                    openImageViewer(imgIndex);
                                  } else {
                                    window.open(adj.url, "_blank", "noopener");
                                  }
                                }}
                              >
                                Ver
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </section>

                {isClosed && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Venta cerrada correctamente.
                  </div>
                )}
              </div>

              {/* FOOTER STICKY */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-5 py-4 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving || isClosed}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar estado"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmCloseOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelCloseSale}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar cierre</h3>
              <p className="text-sm text-gray-700 mb-4">
                Vas a marcar la venta como completada. ¿Deseas continuar?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelCloseSale}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCloseSale}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visor de imágenes (mismo que Ver venta) */}
      <ImageViewer
        isOpen={viewer.isOpen}
        onClose={() => setViewer((v) => ({ ...v, isOpen: false }))}
        images={viewer.items}
        currentIndex={viewer.index}
        onIndexChange={(idx) => setViewer((v) => ({ ...v, index: idx }))}
      />

      {/* Visor PDF simple */}
      {pdfViewer.isOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPdfViewer({ isOpen: false, url: "", name: "" })}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-semibold text-gray-800 truncate">{pdfViewer.name || "Documento PDF"}</span>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => window.open(pdfViewer.url, "_blank", "noopener")}
                >
                  Abrir en nueva pestaña
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
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
