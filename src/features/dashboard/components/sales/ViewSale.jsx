import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ventaApiService from "../../../../shared/services/ventaApiService";

export default function ViewSaleModal({ sale, onClose }) {
  if (!sale) return null;

  const raw = sale.raw || {};
  const show = (value, fallback = "N/D") =>
    value === null || value === undefined || value === "" ? fallback : value;
  const snapshot = sale.formSnapshot || {};
  const vendedor = sale.vendedor || sale.seller || {};
  const vendedorPersona = vendedor.persona || vendedor.Persona || {};

  const pick = (...values) => values.find((v) => v !== null && v !== undefined && v !== "");

  const buildPersonName = (persona = {}) => {
    const full = [persona.nombre_completo, persona.apellido_completo].filter(Boolean).join(" ").trim();
    if (full) return full;

    return [persona.primer_nombre, persona.segundo_nombre, persona.primer_apellido, persona.segundo_apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
  };

  // Priorizar siempre los campos crudos (raw) sobre los normalizados
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

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const num = Number(value);
    if (!Number.isFinite(num)) return show(value, "-");
    return Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? show(value, "-") : date.toLocaleDateString("es-CO");
  };

  const fechaCompra = pick(sale.fecha, sale.fecha_venta, sale.fechaCompra, raw.fecha, raw.fecha_venta, raw.fechaCompra, snapshot.fecha);
  const valorCompra = pick(sale.valor, sale.valor_venta, sale.valorCompra, raw.valor, raw.valor_venta);
  const medioPago = pick(sale.medioPago, raw.medio_pago, sale.medio_pago, snapshot.medioPago, snapshot.medio_pago);
  const estadoVenta = pick(sale.estado, sale.estado_venta, raw.estado_venta, raw.estado);

  const [attachments, setAttachments] = useState(sale.adjuntos || []);

  // Siempre refrescar adjuntos al abrir el modal o cambiar la venta
  useEffect(() => {
    const loadAttachments = async () => {
      const id = sale.id_venta || sale.id;
      if (!id) return;
      try {
        const resp = await ventaApiService.listarAdjuntos(id);
        const adj = resp?.data || resp?.data?.data || resp || [];
        if (Array.isArray(adj)) setAttachments(adj);
      } catch {
        // si falla, dejamos los existentes en sale
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

  return (
    <AnimatePresence>
      {sale && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm z-50 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative max-h-[88vh] overflow-hidden"
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.button>

            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Detalle de la Venta</h2>
                <p className="text-sm text-gray-600">Revisa los datos completos de la transacción.</p>
              </div>

              {/* Resumen de la operación */}
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span role="img" aria-label="money">💵</span>
                  Datos de la operación
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Fecha de compra:</p>
                    <p className="text-gray-900">{formatDate(fechaCompra)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Valor de compra:</p>
                    <p className="text-gray-900 font-semibold">{formatCurrency(valorCompra)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Medio de pago:</p>
                    <p className="text-gray-900">{show(medioPago, "-")}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Estado de la venta:</p>
                    <p className="text-gray-900">{show(estadoVenta, "-")}</p>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Información General */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información General</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Registro:</p>
                      <p className="text-gray-900">{show(sale.registro || snapshot.inmuebleRegistro)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Tipo:</p>
                      <p className="text-gray-900">{show(sale.tipo || snapshot.inmuebleTipo)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Fecha:</p>
                      <p className="text-gray-900">{show(sale.fecha)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Valor:</p>
                      <p className="text-gray-900 font-bold text-green-600">{show(sale.valor, "$ 0")}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Medio de pago:</p>
                      <p className="text-gray-900">{show(sale.medioPago || raw.medio_pago || snapshot.medioPago)}</p>
                    </div>
                    {(sale.medioPago || raw.medio_pago || snapshot.medioPago || "").toLowerCase() === "mixto" && (
                      <div className="md:col-span-2 lg:col-span-3">
                        <p className="font-semibold text-gray-700">Descripción pago mixto:</p>
                        <p className="text-gray-900 whitespace-pre-line">
                          {show(
                            raw.descripcion_pago ||
                              raw.medio_pago_descripcion ||
                              sale.medioPagoDescripcion ||
                              snapshot.medioPagoDescripcion ||
                              sale.descripcionPagoMixto,
                            "Sin descripción"
                          )}
                        </p>
                      </div>
                    )}

                    <div className="mt-2">
                      <p className="font-semibold text-gray-700">Estado:</p>
                      <p className="text-gray-900 text-sm font-semibold">{show(sale.estado)}</p>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="font-semibold text-gray-700">Descripción de seguimiento:</p>
                      <p className="text-gray-900 whitespace-pre-line">
                        {cleanDescription(
                          sale.descripcionSeguimiento || sale.descripcion_seguimiento || snapshot.descripcionSeguimiento
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comprador */}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Comprador</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Tipo de documento:</p>
                      <p className="text-gray-900">{show(sale.compradorTipoDocumento || snapshot.compradorTipoDocumento)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Documento:</p>
                      <p className="text-gray-900">{show(sale.compradorDocumento || snapshot.compradorDocumento)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="font-semibold text-gray-700">Nombre completo:</p>
                      <p className="text-gray-900">
                        {show(sale.compradorNombreCompleto || snapshot.compradorNombreCompleto, "Sin comprador")}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Correo:</p>
                      <a
                        href={`mailto:${sale.compradorCorreo || ""}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {show(sale.compradorCorreo || snapshot.compradorCorreo, "Sin correo")}
                      </a>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Teléfono:</p>
                      <p className="text-gray-900">
                        {show(sale.compradorTelefono || snapshot.compradorTelefono, "Sin teléfono")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vendedor */}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Vendedor</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Tipo de documento:</p>
                      <p className="text-gray-900">{show(vendedorTipoDocumento)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Documento:</p>
                      <p className="text-gray-900">{show(vendedorDocumento)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="font-semibold text-gray-700">Nombre completo:</p>
                      <p className="text-gray-900">{show(vendedorNombreCompleto, "Sin vendedor")}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Correo:</p>
                      <a
                        href={`mailto:${vendedorCorreo || ""}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {show(vendedorCorreo, "Sin correo")}
                      </a>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Teléfono:</p>
                      <p className="text-gray-900">{show(vendedorTelefono, "Sin teléfono")}</p>
                    </div>
                  </div>
                </div>

                {/* Inmueble */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Inmueble</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700">Tipo:</p>
                      <p className="text-gray-900">{show(sale.inmuebleTipo)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Registro:</p>
                      <p className="text-gray-900">{show(sale.inmuebleRegistro)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Nombre:</p>
                      <p className="text-gray-900">{show(sale.inmuebleNombre)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Habitaciones:</p>
                      <p className="text-gray-900">{show(sale.inmuebleHabitaciones || snapshot.inmuebleHabitaciones)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Baños:</p>
                      <p className="text-gray-900">{show(sale.inmuebleBanos || snapshot.inmuebleBanos)}</p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <p className="font-semibold text-gray-700">Dirección:</p>
                      <p className="text-gray-900">{show(sale.inmuebleDireccion)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Barrio:</p>
                      <p className="text-gray-900">{show(sale.inmuebleBarrio || snapshot.inmuebleBarrio)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Ciudad:</p>
                      <p className="text-gray-900">{show(sale.inmuebleCiudad || snapshot.inmuebleCiudad)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Departamento:</p>
                      <p className="text-gray-900">{show(sale.inmuebleDepartamento || snapshot.inmuebleDepartamento)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">País:</p>
                      <p className="text-gray-900">{show(sale.inmueblePais || snapshot.inmueblePais)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Precio:</p>
                      <p className="text-gray-900 font-bold text-green-600">
                        {show(sale.valor || sale.inmueblePrecio || snapshot.inmueblePrecio, "$ 0")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adjuntos */}
                <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Comprobantes y Contratos</h3>
                  {attachments.length === 0 ? (
                    <p className="text-sm text-gray-600">No hay archivos adjuntos aún.</p>
                  ) : (
                    <ul className="space-y-2 text-sm text-gray-800">
                      {attachments.map((file, idx) => (
                        <li
                          key={file.id_adjunto || file.id || idx}
                          className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
                        >
                          <span className="truncate flex-1">
                            {file.nombre_archivo || file.nombre || file.filename || `Archivo ${idx + 1}`}
                          </span>
                          {file.url && (
                            <div className="flex items-center gap-3 shrink-0">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Ver
                              </a>
                              <a href={file.url} download className="text-blue-600 hover:underline">
                                Descargar
                              </a>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
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
