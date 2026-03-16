import React, { useMemo } from "react";
import { FaImage, FaMapMarkerAlt, FaMoneyBillWave, FaTimes } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";

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

export default function BuyerView({ buyer, onClose }) {
  const fullName = [
    buyer?.primerNombre,
    buyer?.segundoNombre,
    buyer?.primerApellido,
    buyer?.segundoApellido,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const operacion =
    buyer?.ultimaVenta || buyer?.compra || buyer?.venta || buyer?.sale || buyer?.raw?.venta || null;
  const rawVenta = buyer?.raw?.venta || buyer?.raw || {};

  const inmueble = buyer?.inmueble || operacion?.inmueble || null;

  const registroInmobiliario =
    inmueble?.registro || inmueble?.registro_inmobiliario || inmueble?.registroInmobiliario || "-";

  const imagenInmueble =
    inmueble?.image ||
    inmueble?.imagen_principal ||
    inmueble?.imagen_portada ||
    inmueble?.portada ||
    (Array.isArray(inmueble?.imagenes) ? inmueble.imagenes[0] : "") ||
    "";

  const fechaCompra =
    operacion?.fecha_venta || operacion?.fechaCompra || operacion?.fecha || buyer?.fechaCompra || null;

  const valorCompra =
    operacion?.valor_venta || operacion?.valorCompra || operacion?.valor || buyer?.valorCompra || null;

  const medioPago =
    operacion?.medio_pago ||
    operacion?.medioPago ||
    operacion?.descripcion_pago ||
    operacion?.medio_pago_descripcion ||
    operacion?.medioPagoDescripcion ||
    rawVenta?.medio_pago ||
    rawVenta?.medioPago ||
    rawVenta?.descripcion_pago ||
    rawVenta?.medio_pago_descripcion ||
    rawVenta?.medioPagoDescripcion ||
    buyer?.medioPago ||
    buyer?.medio_pago ||
    buyer?.descripcion_pago ||
    buyer?.medioPagoDescripcion ||
    buyer?.medio_pago_descripcion ||
    null;

  const estadoVenta =
    operacion?.estado || operacion?.estado_venta || buyer?.estado_venta || buyer?.estado || null;

  const categoriaTipo = useMemo(() => {
    if (!inmueble) return "-";
    return inmueble?.categoria || inmueble?.tipo || inmueble?.categoriaInmueble || "N/D";
  }, [inmueble]);

  const medioPagoDisplay = useMemo(() => {
    const base = medioPago ?? "";
    const desc = medioPagoDescripcion ?? "";
    const inferredCredit =
      buyer?.entidadFinanciera ||
      buyer?.numeroCredito ||
      buyer?.montoFinanciado ||
      operacion?.entidad_financiera ||
      operacion?.numero_credito ||
      operacion?.monto_financiado;
    const fallback = inferredCredit ? "Credito" : "";

    if (!base && !desc) return fallback || "-";
    if (!base) return desc || fallback;
    if (!desc) return base;
    const normalizedBase = base.toString().trim().toLowerCase();
    const normalizedDesc = desc.toString().trim().toLowerCase();
    if (normalizedBase === normalizedDesc) return base;
    const lowerBase = normalizedBase;
    if (lowerBase === "mixto") return `${base}: ${desc}`;
    return `${base} - ${desc}`;
  }, [buyer?.entidadFinanciera, buyer?.montoFinanciado, buyer?.numeroCredito, medioPago, medioPagoDescripcion, operacion?.entidad_financiera, operacion?.monto_financiado, operacion?.numero_credito]);

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
            className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.99 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header sticky compacto */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
              <div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    Información del comprador
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Detalles del comprador, el inmueble y la operación realizada.
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

            {/* Body */}
            <div className="max-h-[72vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Personal (sin pill CC) */}
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Información personal</h3>
                    {/* quitado el Pill de tipoDocumento */}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Nombre" value={fullName || "-"} className="sm:col-span-2" />

                    <Field
                      label="Documento"
                      value={
                        (buyer?.tipoDocumento ? `${buyer.tipoDocumento} - ` : "") + (buyer?.documento || "-")
                      }
                    />

                    <Field label="Teléfono" value={buyer?.telefono || "-"} />

                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-semibold text-gray-500">Correo</p>
                      <div className="mt-0.5 text-sm break-words">
                        {buyer?.correo ? (
                          <a href={`mailto:${buyer.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                            {buyer.correo}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Operación */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FaMoneyBillWave className="text-green-600" />
                      Operación
                    </h3>
                    <Pill tone={estadoTone(estadoVenta)}>{estadoVenta || "-"}</Pill>
                  </div>

                  {operacion ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <Field label="Fecha" value={formatDateCompact(fechaCompra)} />
                        <Field label="Valor" value={formatMoneyCOP(valorCompra)} />
                        <Field label="Medio de pago" value={medioPago || "-"} className="col-span-2" />
                      </div>

                      {(operacion?.observaciones || buyer?.observaciones) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[11px] font-semibold text-gray-500 mb-1">Observaciones</p>
                          <p className="text-sm text-gray-900 whitespace-pre-line leading-5">
                            {operacion?.observaciones || buyer?.observaciones}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <FaImage size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 italic text-sm">
                        Aún no se ha registrado una operación para este comprador.
                      </p>
                    </div>
                  )}
                </section>

                {/* Inmueble */}
                <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-blue-600" />
                      Inmueble adquirido
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
                          <Field label="Dirección" value={inmueble?.direccion || "N/D"} className="sm:col-span-2" />
                          <Field
                            label="Ubicación"
                            value={(inmueble?.ciudad || "N/D") + ", " + (inmueble?.departamento || "N/D")}
                            className="sm:col-span-2"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm italic">Sin inmuebles asignados</div>
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