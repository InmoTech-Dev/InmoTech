import React, { useMemo } from "react";
import { FaTimes, FaImage } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";

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

function formatMoneyCOP(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(value) {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

function cleanLeaseDescription(value) {
  if (!value) return "";

  return String(value)
    .replace(/\s*(Decision|Decisión)\s*:\s*[\s\S]*$/i, "")
    .replace(/\s*Observaci[oó]n\s*:\s*[\s\S]*$/i, "")
    .replace(/\s*Soporte\s*:\s*https?:\/\/\S+/i, "")
    .trim();
}

function estadoTone(estado) {
  const e = (estado || "").toLowerCase();
  if (["pagado", "activo", "vigente", "al día", "al dia"].some((k) => e.includes(k))) return "green";
  if (["pendiente", "por pagar"].some((k) => e.includes(k))) return "yellow";
  if (!estado) return "gray";
  return "red";
}

function normalizeAmenityName(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeDisplayValue(value) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim();
  return normalized === "-" ? "" : normalized;
}

export default function ViewRenant({ renant, onClose }) {
  const descripcionContrato = cleanLeaseDescription(
    renant?.ultimoSeguimientoDescripcion ||
      renant?.ultimoSeguimientoComentario ||
      renant?.ultimo_seguimiento_descripcion ||
      renant?.ultimo_seguimiento_comentario ||
      renant?.descripcionContrato ||
      renant?.descripcion_arriendo ||
      renant?.descripcionInmueble ||
      renant?.descripcion ||
      ""
  );

  const persona =
    renant?.arrendatarioRaw ||
    renant?.arrendatarioPersona ||
    renant?.persona ||
    renant?.arrendatario?.persona ||
    renant?.arrendatario ||
    {};

  const inmueble =
    renant?.rawLease?.Inmueble ||
    renant?.rawLease?.inmueble ||
    renant?.inmueble ||
    {};

  const comodidades = Array.isArray(inmueble?.comodidades) ? inmueble.comodidades : [];
  const habitacionesComodidad = comodidades.find(
    (item) => normalizeAmenityName(item?.nombre) === "habitaciones"
  );
  const banosComodidad = comodidades.find(
    (item) => normalizeAmenityName(item?.nombre) === "banos"
  );

  const habitaciones =
    normalizeDisplayValue(renant?.habitaciones) ||
    habitacionesComodidad?.Inmueble_Comodidades?.cantidad ||
    habitacionesComodidad?.Inmueble_Comodidad?.cantidad ||
    habitacionesComodidad?.cantidad ||
    normalizeDisplayValue(inmueble?.habitaciones) ||
    "-";

  const banos =
    normalizeDisplayValue(renant?.banos) ||
    banosComodidad?.Inmueble_Comodidades?.cantidad ||
    banosComodidad?.Inmueble_Comodidad?.cantidad ||
    banosComodidad?.cantidad ||
    normalizeDisplayValue(inmueble?.banos) ||
    "-";

  const tipoDocArr =
    persona.tipo_documento || renant?.tipoDocArrendatario || renant?.tipoDocInquilino || "";
  const numeroDocArr =
    persona.numero_documento || renant?.numeroDocArrendatario || renant?.numeroDocInquilino || "";
  const correoArr = persona.correo || renant?.correoArrendatario || renant?.correoInquilino || "";
  const telefonoArr =
    persona.telefono || renant?.telefonoArrendatario || renant?.telefonoInquilino || "";
  const nombreArr =
    persona.nombre_completo ||
    renant?.nombreCompletoArrendatario ||
    [
      renant?.primerNombreArrendatario,
      renant?.segundoNombreArrendatario,
      renant?.primerApellidoArrendatario,
      renant?.segundoApellidoArrendatario,
    ]
      .filter(Boolean)
      .join(" ");

  const codeudorPersona =
    renant?.codeudorRaw ||
    renant?.codeudorPersona ||
    renant?.codeudor?.persona ||
    (renant?.codeudor?.id_persona ? renant.codeudor : {}) ||
    renant?.codeudor_persona ||
    renant?.codeudorPersona ||
    {};

  const tipoDocCod = codeudorPersona.tipo_documento || renant?.tipoDocCodeudor || "";
  const numeroDocCod = codeudorPersona.numero_documento || renant?.numeroDocCodeudor || "";
  const correoCod = codeudorPersona.correo || renant?.correoCodeudor || "";
  const telefonoCod = codeudorPersona.telefono || renant?.telefonoCodeudor || "";
  const actividadEconomicaCod =
    codeudorPersona.actividad_economica || renant?.actividadEconomicaCodeudor || "";
  const nombreCod =
    codeudorPersona.nombre_completo ||
    renant?.nombreCodeudor ||
    [
      renant?.primerNombreCodeudor,
      renant?.segundoNombreCodeudor,
      renant?.primerApellidoCodeudor,
      renant?.segundoApellidoCodeudor,
    ]
      .filter(Boolean)
      .join(" ");

  const money = useMemo(() => formatMoneyCOP(renant?.valorMensual), [renant?.valorMensual]);
  const inicio = useMemo(() => formatDate(renant?.fechaInicio), [renant?.fechaInicio]);
  const fin = useMemo(() => formatDate(renant?.fechaFinal), [renant?.fechaFinal]);
  const cobro = useMemo(() => formatDate(renant?.fechaCobro), [renant?.fechaCobro]);

  return (
    <AnimatePresence>
      {renant && (
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
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
              <div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    Información del arriendo
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Detalles del contrato de arrendamiento.
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Contrato</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-500">Estado</span>
                      <Pill tone={estadoTone(renant?.estado)}>{renant?.estado}</Pill>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Inicio" value={inicio} />
                    <Field label="Fin" value={fin} />
                    <Field label="Cobro" value={cobro || "No especificada"} />
                    <Field label="Valor mensual" value={money || renant?.valorMensual} />
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Descripción</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-5">
                      {descripcionContrato || "Sin descripción"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Inmueble</h3>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {renant?.tipoInmueble ? <Pill tone="blue">{renant?.tipoInmueble}</Pill> : null}
                      {renant?.registroInmobiliario ? (
                        <Pill tone="gray">{renant?.registroInmobiliario}</Pill>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                      <FaImage size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {renant?.nombreInmueble || "Inmueble arrendado"}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <Field label="Área" value={renant?.area ? `${renant?.area} m²` : "-"} />
                        <Field label="Hab." value={habitaciones} />
                        <Field label="Baños" value={banos} />
                      </div>
                      <div className="mt-2">
                        <Field
                          label="Ciudad/Dep"
                          value={
                            (renant?.ciudad || "-") +
                            (renant?.departamento ? `, ${renant?.departamento}` : "")
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Dirección" value={renant?.direccion || "-"} className="col-span-2" />
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Arrendatario</h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Tipo doc" value={tipoDocArr} />
                    <Field label="Documento" value={numeroDocArr} />
                    <Field label="Teléfono" value={telefonoArr} />
                    <Field label="Correo" value={correoArr || "-"} />
                    <Field label="Nombre" value={nombreArr || "-"} className="col-span-2" />
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Codeudor</h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Tipo doc" value={tipoDocCod} />
                    <Field label="Documento" value={numeroDocCod} />
                    <Field label="Teléfono" value={telefonoCod} />
                    <Field label="Actividad económica" value={actividadEconomicaCod || "-"} />
                    <Field label="Correo" value={correoCod || "-"} />
                    <Field label="Nombre" value={nombreCod || "-"} className="col-span-2" />
                  </div>
                </section>
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
