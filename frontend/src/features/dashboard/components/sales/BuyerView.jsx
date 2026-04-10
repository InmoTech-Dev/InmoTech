import React, { useEffect, useMemo, useState } from "react";
import { FaImage, FaMapMarkerAlt, FaMoneyBillWave, FaTimes } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { buyersApiService } from "../../../../shared/services/buyersApiService";

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tones[tone]}`}>
      {children || "-"}
    </span>
  );
}

function estadoTone(estado) {
  const e = (estado || "").toLowerCase();
  if (["pagad", "complet", "aprob", "activa", "activo"].some((k) => e.includes(k))) return "green";
  if (["pend", "proceso", "revision", "revisión"].some((k) => e.includes(k))) return "yellow";
  if (!estado) return "gray";
  if (["cancel", "rechaz", "anulad"].some((k) => e.includes(k))) return "red";
  return "blue";
}

function formatMoneyCOP(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(num);
}

function formatDateCompact(value) {
  if (!value) return "-";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-CO");
}

function resolveImage(inmueble) {
  if (!inmueble) return "";
  if (typeof inmueble.image === "string") return inmueble.image;
  if (typeof inmueble.imagen_principal === "string") return inmueble.imagen_principal;
  if (typeof inmueble.imagen_portada === "string") return inmueble.imagen_portada;
  if (typeof inmueble.portada === "string") return inmueble.portada;
  if (Array.isArray(inmueble.imagenes) && inmueble.imagenes.length > 0) {
    const firstImage = inmueble.imagenes[0];
    return typeof firstImage === "string" ? firstImage : firstImage?.ruta_archivo || "";
  }
  return "";
}

function resolveHistory(buyer) {
  if (Array.isArray(buyer?.historialVentas) && buyer.historialVentas.length > 0) {
    return buyer.historialVentas;
  }
  if (Array.isArray(buyer?.historial_ventas) && buyer.historial_ventas.length > 0) {
    return buyer.historial_ventas;
  }
  if (buyer?.ultimaVenta || buyer?.ultima_venta || buyer?.compra || buyer?.venta || buyer?.sale) {
    return [buyer.ultimaVenta || buyer.ultima_venta || buyer.compra || buyer.venta || buyer.sale];
  }
  return [];
}

export default function BuyerView({ buyer, onClose }) {
  const [detailedBuyer, setDetailedBuyer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBuyerDetail = async () => {
      const buyerId = buyer?.compradorId ?? buyer?.id ?? buyer?.buyerId ?? buyer?.raw?.id_comprador;
      if (!buyerId) {
        setDetailedBuyer(null);
        return;
      }

      setIsLoading(true);
      try {
        const data = await buyersApiService.getById(buyerId);
        if (!cancelled) {
          setDetailedBuyer(data);
        }
      } catch (_error) {
        if (!cancelled) {
          setDetailedBuyer(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadBuyerDetail();
    return () => {
      cancelled = true;
    };
  }, [buyer?.buyerId, buyer?.compradorId, buyer?.id, buyer?.raw?.id_comprador]);

  const resolvedBuyer = detailedBuyer || buyer;

  const fullName = [
    resolvedBuyer?.primerNombre,
    resolvedBuyer?.segundoNombre,
    resolvedBuyer?.primerApellido,
    resolvedBuyer?.segundoApellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const salesHistory = useMemo(() => resolveHistory(resolvedBuyer), [resolvedBuyer]);
  const latestSale = salesHistory[0] || resolvedBuyer?.ultimaVenta || resolvedBuyer?.ultima_venta || resolvedBuyer?.compra || null;
  const inmueble = latestSale?.inmueble || resolvedBuyer?.inmueble || null;
  const registroInmobiliario =
    inmueble?.registro || inmueble?.registro_inmobiliario || inmueble?.registroInmobiliario || "-";
  const imagenInmueble = resolveImage(inmueble);
  const categoriaTipo = inmueble?.categoria || inmueble?.tipo || inmueble?.categoriaInmueble || "-";

  const latestPaymentDisplay = useMemo(() => {
    const medioPago =
      latestSale?.medio_pago ||
      latestSale?.medioPago ||
      latestSale?.descripcion_pago ||
      latestSale?.medio_pago_descripcion ||
      latestSale?.medioPagoDescripcion ||
      resolvedBuyer?.medioPago ||
      resolvedBuyer?.medio_pago ||
      null;
    const medioPagoDescripcion =
      latestSale?.medio_pago_descripcion ||
      latestSale?.medioPagoDescripcion ||
      latestSale?.descripcion_pago ||
      resolvedBuyer?.medioPagoDescripcion ||
      resolvedBuyer?.medio_pago_descripcion ||
      null;

    if (!medioPago && !medioPagoDescripcion) return "-";
    if (!medioPago) return medioPagoDescripcion;
    if (!medioPagoDescripcion || medioPago === medioPagoDescripcion) return medioPago;
    return `${medioPago} - ${medioPagoDescripcion}`;
  }, [latestSale, resolvedBuyer?.medioPago, resolvedBuyer?.medioPagoDescripcion, resolvedBuyer?.medio_pago, resolvedBuyer?.medio_pago_descripcion]);

  return (
    <AnimatePresence>
      {buyer && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] p-3 sm:p-4 flex items-center justify-center"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.99 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
              <div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    Información del comprador
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Detalles del comprador, su último inmueble y el historial de ventas registradas.
                  </p>
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

            <div className="max-h-[72vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                  Cargando detalle del comprador...
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Información personal</h3>
                    <Pill tone="blue">{resolvedBuyer?.registro || resolvedBuyer?.raw?.registro_comprador || "Comprador"}</Pill>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Nombre" value={fullName || "-"} className="sm:col-span-2" />
                    <Field
                      label="Documento"
                      value={(resolvedBuyer?.tipoDocumento ? `${resolvedBuyer.tipoDocumento} - ` : "") + (resolvedBuyer?.documento || "-")}
                    />
                    <Field label="Estado" value={resolvedBuyer?.estado || "-"} />
                    <Field label="Teléfono" value={resolvedBuyer?.telefono || "-"} />
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-semibold text-gray-500">Correo</p>
                      <div className="mt-0.5 text-sm break-words">
                        {resolvedBuyer?.correo ? (
                          <a href={`mailto:${resolvedBuyer.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                            {resolvedBuyer.correo}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FaMoneyBillWave className="text-green-600" />
                      Última venta registrada
                    </h3>
                    <Pill tone={estadoTone(latestSale?.estado || resolvedBuyer?.estado)}>{latestSale?.estado || "-"}</Pill>
                  </div>

                  {latestSale ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <Field label="Fecha" value={formatDateCompact(latestSale?.fecha_venta || resolvedBuyer?.fechaCompra)} />
                        <Field label="Valor" value={formatMoneyCOP(latestSale?.valor_venta || resolvedBuyer?.valorCompra)} />
                        <Field label="Medio de pago" value={latestPaymentDisplay} className="col-span-2" />
                        <Field label="ID Venta" value={latestSale?.id_venta || "-"} />
                        <Field label="Total registros" value={salesHistory.length || 1} />
                      </div>

                      {(latestSale?.observaciones || resolvedBuyer?.observaciones) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[11px] font-semibold text-gray-500 mb-1">Observaciones</p>
                          <p className="text-sm text-gray-900 whitespace-pre-line leading-5">
                            {latestSale?.observaciones || resolvedBuyer?.observaciones}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <FaImage size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 italic text-sm">
                        Aún no se ha registrado una venta para este comprador.
                      </p>
                    </div>
                  )}
                </section>

                <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-blue-600" />
                      Último inmueble registrado
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {categoriaTipo && categoriaTipo !== "-" ? <Pill tone="blue">{categoriaTipo}</Pill> : null}
                      {registroInmobiliario && registroInmobiliario !== "-" ? <Pill>{registroInmobiliario}</Pill> : null}
                    </div>
                  </div>

                  {inmueble ? (
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-full md:w-40 h-28 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-gray-400 shrink-0">
                        {imagenInmueble ? (
                          <img src={imagenInmueble} alt="Inmueble" className="w-full h-full object-cover" />
                        ) : (
                          <FaImage size={22} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                          <Field label="Registro inmobiliario" value={registroInmobiliario} />
                          <Field label="Categoría / Tipo" value={categoriaTipo} />
                          <Field label="Título" value={inmueble?.titulo || "N/D"} className="sm:col-span-2" />
                          <Field label="Dirección" value={inmueble?.direccion || "N/D"} className="sm:col-span-2" />
                          <Field
                            label="Ubicación"
                            value={`${inmueble?.ciudad || "N/D"}, ${inmueble?.departamento || "N/D"}`}
                            className="sm:col-span-2"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm italic">Sin inmuebles registrados</div>
                  )}
                </section>

                {salesHistory.length > 1 ? (
                  <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Historial de ventas</h3>
                      <Pill tone="gray">{salesHistory.length} registros</Pill>
                    </div>

                    <div className="space-y-3">
                      {salesHistory.map((sale, index) => {
                        const saleInmueble = sale?.inmueble || null;
                        const saleRegistro =
                          saleInmueble?.registro_inmobiliario || saleInmueble?.registro || saleInmueble?.registroInmobiliario || "-";
                        const saleTitulo = saleInmueble?.titulo || saleInmueble?.direccion || "Sin inmueble";

                        return (
                          <div
                            key={sale?.id_venta || `${saleRegistro}-${index}`}
                            className="rounded-xl border border-gray-200 bg-white p-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{saleTitulo}</p>
                                <p className="text-xs text-gray-500">Registro: {saleRegistro}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Pill tone={estadoTone(sale?.estado)}>{sale?.estado || "Sin estado"}</Pill>
                                <Pill tone="blue">{formatDateCompact(sale?.fecha_venta)}</Pill>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2">
                              <Field label="Valor" value={formatMoneyCOP(sale?.valor_venta)} />
                              <Field label="Medio de pago" value={sale?.medio_pago || "-"} />
                              <Field label="ID Venta" value={sale?.id_venta || "-"} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>

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
