import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import ventaApiService from "../../../../shared/services/ventaApiService";

/* ---------- UI helpers (mismo estilo compacto) ---------- */
function Field({ label, value, className = "" }) {
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
}

function Pill({ children, tone = "gray" }) {
  const tones = {
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tones[tone]}`}
    >
      {children || "-"}
    </span>
  );
}

function estadoTone(estado) {
  const e = (estado || "").toLowerCase();
  if (["pagada", "pagado", "completada", "aprobada", "activo", "activa"].some((k) => e.includes(k))) return "green";
  if (["pendiente", "en proceso", "por pagar", "revisión", "revision"].some((k) => e.includes(k))) return "yellow";
  if (!estado) return "gray";
  if (["cancel", "rechaz", "anulad"].some((k) => e.includes(k))) return "red";
  return "blue";
}

function formatMoneyCOP(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateCompact(value) {
  if (!value) return "-";
  const s = String(value);
  // si viene YYYY-MM-DD, lo dejamos
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("es-CO");
}

/* ---------- Component ---------- */
export default function ViewSaleModal({ sale, onClose }) {
  if (!sale) return null;

  const raw = sale.raw || {};
  const snapshot = sale.formSnapshot || {};
  const vendedor = sale.vendedor || sale.seller || {};
  const vendedorPersona = vendedor.persona || vendedor.Persona || {};

  const show = (value, fallback = "-") =>
    value === null || value === undefined || value === "" ? fallback : value;

  const pick = (...values) => values.find((v) => v !== null && v !== undefined && v !== "");

  const buildPersonName = (persona = {}) => {
    const full = [persona.nombre_completo, persona.apellido_completo].filter(Boolean).join(" ").trim();
    if (full) return full;

    return [persona.primer_nombre, persona.segundo_nombre, persona.primer_apellido, persona.segundo_apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
  };

  // Priorizar siempre raw
  const vendedorTipoDocumento = pick(
    raw.vendedorTipoDocumento,
    raw.tipo_documento_vendedor,
    raw.vendedor_tipo_documento,
    raw.tipo_doc_vendedor,
    sale.tipo_documento_vendedor,
    sale.vendedor_tipo_documento,
    sale.tipo_doc_vendedor,
    sale.vendedorTipoDocumento,
    snapshot.vendedorTipoDocumento,
    snapshot.tipo_documento_vendedor,
    snapshot.tipo_doc_vendedor,
    vendedor.tipo_documento,
    vendedorPersona.tipo_documento
  );

  const vendedorDocumento = pick(
    raw.vendedorDocumento,
    raw.vendedor_numero_documento,
    raw.numero_doc_vendedor,
    raw.documento_vendedor,
    sale.vendedor_numero_documento,
    sale.numero_doc_vendedor,
    sale.documento_vendedor,
    sale.vendedorDocumento,
    snapshot.vendedorDocumento,
    snapshot.vendedor_numero_documento,
    snapshot.numero_doc_vendedor,
    snapshot.documento_vendedor,
    vendedor.numero_documento,
    vendedorPersona.numero_documento
  );

  const vendedorNombreCompleto =
    pick(
      raw.vendedorNombreCompleto,
      raw.vendedor_nombre_completo,
      raw.vendedor_nombre,
      raw.nombre_vendedor,
      raw.nombreVendedor,
      raw.nombre_completo_vendedor,
      sale.vendedor_nombre_completo,
      sale.vendedor_nombre,
      sale.nombre_vendedor,
      sale.nombreVendedor,
      sale.nombre_completo_vendedor,
      sale.vendedorNombreCompleto,
      snapshot.vendedorNombreCompleto,
      snapshot.vendedor_nombre_completo,
      snapshot.vendedor_nombre,
      snapshot.nombre_vendedor,
      snapshot.nombre_completo_vendedor,
      vendedor.nombre_completo
    ) ||
    buildPersonName(vendedor) ||
    buildPersonName(vendedorPersona);

  const vendedorCorreo = pick(
    raw.vendedorCorreo,
    raw.vendedor_correo,
    raw.correo_vendedor,
    sale.vendedor_correo,
    sale.correo_vendedor,
    sale.vendedorCorreo,
    snapshot.vendedorCorreo,
    snapshot.vendedor_correo,
    snapshot.correo_vendedor,
    vendedor.correo,
    vendedorPersona.correo
  );

  const vendedorTelefono = pick(
    raw.vendedorTelefono,
    raw.vendedor_telefono,
    raw.telefono_vendedor,
    sale.vendedor_telefono,
    sale.telefono_vendedor,
    sale.vendedorTelefono,
    snapshot.vendedorTelefono,
    snapshot.vendedor_telefono,
    snapshot.telefono_vendedor,
    vendedor.telefono,
    vendedorPersona.telefono
  );

  const fechaCompra = pick(
    sale.fecha,
    sale.fecha_venta,
    sale.fechaCompra,
    raw.fecha,
    raw.fecha_venta,
    raw.fechaCompra,
    snapshot.fecha
  );
  const valorCompra = pick(sale.valor, sale.valor_venta, sale.valorCompra, raw.valor, raw.valor_venta, snapshot.valor);
  const medioPago = pick(sale.medioPago, raw.medio_pago, sale.medio_pago, snapshot.medioPago, snapshot.medio_pago);
  const estadoVenta = pick(sale.estado, sale.estado_venta, raw.estado_venta, raw.estado);

  const [attachments, setAttachments] = useState(sale.adjuntos || []);

  useEffect(() => {
    const loadAttachments = async () => {
      const id = sale.id_venta || sale.id;
      if (!id) return;
      try {
        const resp = await ventaApiService.listarAdjuntos(id);
        const adj = resp?.data || resp?.data?.data || resp || [];
        if (Array.isArray(adj)) setAttachments(adj);
      } catch {
        setAttachments(sale.adjuntos || []);
      }
    };
    loadAttachments();
  }, [sale]);

  const cleanDescription = (text) => {
    if (!text) return "Sin descripción";
    const trimmed = String(text).trim();
    const match = trimmed.match(/^\[[^\]]*?\]\s*(.*)$/);
    const body = match ? match[1].trim() : trimmed;
    return body === "" ? "Sin descripción" : body;
  };

  const isMixto = useMemo(() => {
    const mp = (medioPago || "").toLowerCase();
    return mp === "mixto";
  }, [medioPago]);

  const descPagoMixto = pick(
    raw.descripcion_pago,
    raw.medio_pago_descripcion,
    sale.medioPagoDescripcion,
    snapshot.medioPagoDescripcion,
    sale.descripcionPagoMixto
  );

  return (
    <AnimatePresence>
      {sale && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] p-3 sm:p-4 flex items-center justify-center"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {/* Header sticky compacto */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
              <div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Detalle de la Venta</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Revisa los datos completos de la transacción.</p>
                </div>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 text-gray-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition"
                  aria-label="Cerrar"
                >
                  <FaTimes />
                </motion.button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[72vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
              {/* Operación (compacto, 2 columnas) */}
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Datos de la operación</h3>
                  <Pill tone={estadoTone(estadoVenta)}>{show(estadoVenta, "-")}</Pill>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <Field label="Fecha" value={formatDateCompact(fechaCompra)} />
                  <Field label="Valor" value={formatMoneyCOP(valorCompra)} />
                  <Field label="Medio de pago" value={show(medioPago, "-")} />
                  <Field label="Estado" value={show(estadoVenta, "-")} />
                  {isMixto && (
                    <div className="col-span-2 mt-1">
                      <p className="text-[11px] font-semibold text-gray-500">Descripción pago mixto</p>
                      <p className="mt-0.5 text-sm text-gray-900 whitespace-pre-line leading-5">
                        {show(descPagoMixto, "Sin descripción")}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Grid general: 2 columnas en desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Comprador */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Comprador</h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Tipo doc" value={show(sale.compradorTipoDocumento || snapshot.compradorTipoDocumento)} />
                    <Field label="Documento" value={show(sale.compradorDocumento || snapshot.compradorDocumento)} />
                    <Field
                      label="Correo"
                      value={
                        (sale.compradorCorreo || snapshot.compradorCorreo) ? (
                          <a
                            href={`mailto:${sale.compradorCorreo || snapshot.compradorCorreo}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {sale.compradorCorreo || snapshot.compradorCorreo}
                          </a>
                        ) : "-"
                      }
                      className="col-span-2"
                    />
                    <Field label="Teléfono" value={show(sale.compradorTelefono || snapshot.compradorTelefono, "Sin teléfono")} />
                    <Field label="Nombre" value={show(sale.compradorNombreCompleto || snapshot.compradorNombreCompleto, "Sin comprador")} className="col-span-2" />
                  </div>
                </section>

                {/* Vendedor */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendedor</h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Tipo doc" value={show(vendedorTipoDocumento)} />
                    <Field label="Documento" value={show(vendedorDocumento)} />
                    <Field
                      label="Correo"
                      value={
                        vendedorCorreo ? (
                          <a href={`mailto:${vendedorCorreo}`} className="text-blue-600 hover:text-blue-800 underline">
                            {vendedorCorreo}
                          </a>
                        ) : "-"
                      }
                      className="col-span-2"
                    />
                    <Field label="Teléfono" value={show(vendedorTelefono, "Sin teléfono")} />
                    <Field label="Nombre" value={show(vendedorNombreCompleto, "Sin vendedor")} className="col-span-2" />
                  </div>
                </section>

                {/* Inmueble */}
                <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Inmueble</h3>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {sale.inmuebleTipo ? <Pill tone="blue">{show(sale.inmuebleTipo)}</Pill> : null}
                      {sale.inmuebleRegistro ? <Pill>{show(sale.inmuebleRegistro)}</Pill> : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                    <Field label="Nombre" value={show(sale.inmuebleNombre)} className="col-span-2 sm:col-span-3" />
                    <Field label="Habitaciones" value={show(sale.inmuebleHabitaciones || snapshot.inmuebleHabitaciones)} />
                    <Field label="Baños" value={show(sale.inmuebleBanos || snapshot.inmuebleBanos)} />
                    <Field label="Precio" value={formatMoneyCOP(sale.valor || sale.inmueblePrecio || snapshot.inmueblePrecio)} />

                    <Field label="Dirección" value={show(sale.inmuebleDireccion)} className="col-span-2 sm:col-span-3" />
                    <Field label="Barrio" value={show(sale.inmuebleBarrio || snapshot.inmuebleBarrio)} />
                    <Field label="Ciudad" value={show(sale.inmuebleCiudad || snapshot.inmuebleCiudad)} />
                    <Field label="Departamento" value={show(sale.inmuebleDepartamento || snapshot.inmuebleDepartamento)} />
                    <Field label="País" value={show(sale.inmueblePais || snapshot.inmueblePais)} />
                  </div>
                </section>

                {/* Adjuntos */}
                <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Comprobantes y contratos</h3>
                    <Pill>{attachments.length} archivo(s)</Pill>
                  </div>

                  {attachments.length === 0 ? (
                    <p className="text-sm text-gray-600">No hay archivos adjuntos aún.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {attachments.map((file, idx) => {
                        const name = file.nombre_archivo || file.nombre || file.filename || `Archivo ${idx + 1}`;
                        const url = file.url;
                        return (
                          <li
                            key={file.id_adjunto || file.id || idx}
                            className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50"
                          >
                            <span className="truncate flex-1 text-gray-900">{name}</span>
                            {url ? (
                              <div className="flex items-center gap-3 shrink-0">
                                <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                  Ver
                                </a>
                                <a href={url} download className="text-blue-600 hover:underline">
                                  Descargar
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin URL</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>

            {/* Footer sticky compacto */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 sm:px-5 py-3 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition"
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
