import React, { useEffect, useMemo, useState } from "react";
import { FaTimes, FaImage } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { API_CONFIG } from "../../../../shared/services/api.config";

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

function formatDocument(tipo, numero) {
  const safeTipo = String(tipo || "").trim();
  const safeNumero = String(numero || "").trim();

  if (safeTipo && safeNumero) return `${safeTipo} - ${safeNumero}`;
  if (safeNumero) return safeNumero;
  if (safeTipo) return safeTipo;
  return "-";
}

function cleanLeaseDescription(value) {
  if (!value) return "";

  return String(value)
    .replace(/\s*(Decision|Decisión)\s*:\s*[\s\S]*$/i, "")
    .replace(/\s*Observaci[oó]n\s*:\s*[\s\S]*$/i, "")
    .replace(/\s*Soporte\s*:\s*https?:\/\/\S+/i, "")
    .trim();
}

function getImageUrl(entry) {
  if (!entry) return "";
  const raw =
    typeof entry === "string"
      ? entry
      : (
    entry.ruta_archivo ||
    entry.url ||
    entry.secure_url ||
    entry.src ||
    entry.imagen_url ||
    entry.imagenUrl ||
    entry.foto_url ||
    entry.foto ||
    ""
  );

  const src = String(raw || "").trim();
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }

  const normalizedPath = src.startsWith("/") ? src : `/${src}`;
  if (normalizedPath.startsWith("/uploads/")) {
    const apiOrigin = API_CONFIG.BASE_URL.replace(/\/api\/v\d+$/i, "");
    return `${apiOrigin}${normalizedPath}`;
  }

  return normalizedPath;
}

function normalizeAmenityName(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function estadoTone(estado) {
  const e = (estado || "").toLowerCase();
  if (["pagado", "activo", "vigente", "al dia"].some((k) => e.includes(k))) return "green";
  if (["pendiente", "por pagar"].some((k) => e.includes(k))) return "yellow";
  if (!estado) return "gray";
  return "red";
}

export default function ViewRenant({ renant, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);
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

  const tipoDocArr = persona.tipo_documento || renant?.tipoDocArrendatario || renant?.tipoDocInquilino || "";
  const numeroDocArr = persona.numero_documento || renant?.numeroDocArrendatario || renant?.numeroDocInquilino || "";
  const correoArr = persona.correo || renant?.correoArrendatario || renant?.correoInquilino || "";
  const telefonoArr = persona.telefono || renant?.telefonoArrendatario || renant?.telefonoInquilino || "";
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
  const rawLease = renant?.rawLease || {};
  const rawInmueble = rawLease?.Inmueble || rawLease?.inmueble || {};
  const rawCobros = rawLease?.Cobros || rawLease?.cobros || [];
  const cobrosOrdenados = rawCobros
    .slice()
    .sort((a, b) => new Date(a.fecha_cobro) - new Date(b.fecha_cobro));
  const hoy = new Date();
  const cobroPendiente = cobrosOrdenados.find((cobroItem) => {
    const fecha = new Date(cobroItem.fecha_cobro);
    return cobroItem.estado !== "Pagado" && !Number.isNaN(fecha.getTime()) && fecha >= hoy;
  });
  const cobroMasReciente =
    cobrosOrdenados.length > 0 ? cobrosOrdenados[cobrosOrdenados.length - 1] : null;
  const cobro = useMemo(
    () =>
      formatDate(
        rawLease?.fecha_cobro ||
          rawLease?.fechaCobro ||
          rawLease?.dia_cobro ||
          rawLease?.diaCobro ||
          cobroPendiente?.fecha_cobro ||
          cobroMasReciente?.fecha_cobro ||
          renant?.fechaCobro
      ),
    [
      rawLease?.fecha_cobro,
      rawLease?.fechaCobro,
      rawLease?.dia_cobro,
      rawLease?.diaCobro,
      cobroPendiente?.fecha_cobro,
      cobroMasReciente?.fecha_cobro,
      renant?.fechaCobro,
    ]
  );

  const rawComodidades = rawInmueble?.comodidades || [];
  const banosComodidad = rawComodidades.find(
    (comodidad) => normalizeAmenityName(comodidad?.nombre) === "banos"
  );
  const banos =
    renant?.banos ||
    rawInmueble?.banos ||
    banosComodidad?.Inmueble_Comodidades?.cantidad ||
    banosComodidad?.Inmueble_Comodidad?.cantidad ||
    banosComodidad?.cantidad ||
    "-";
  const imageUrl = useMemo(() => {
    const imageList = Array.isArray(rawInmueble?.imagenes) ? rawInmueble.imagenes : [];
    const mainImage =
      imageList.find((img) => Boolean(img?.es_principal)) ||
      imageList[0] ||
      rawInmueble?.imagen_principal ||
      rawInmueble?.imagen_portada ||
      rawInmueble?.portada ||
      rawInmueble?.imagen_destacada ||
      renant?.imagenInmueble ||
      renant?.imagen_principal ||
      renant?.imagenPortada ||
      renant?.foto ||
      renant?.foto_url;

    return getImageUrl(mainImage);
  }, [
    rawInmueble?.imagenes,
    rawInmueble?.imagen_principal,
    rawInmueble?.imagen_portada,
    rawInmueble?.portada,
    rawInmueble?.imagen_destacada,
    renant?.imagenInmueble,
    renant?.imagen_principal,
    renant?.imagenPortada,
    renant?.foto,
    renant?.foto_url,
  ]);
  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl, renant?.id]);
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
            className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
              <div className="px-4 sm:px-5 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    Información del Arriendo
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

            <div className="max-h-[84vh] overflow-y-auto px-4 sm:px-5 py-3 space-y-2.5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Contrato</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-500">Estado</span>
                      <Pill tone={estadoTone(renant?.estado)}>{renant?.estado}</Pill>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field label="Inicio" value={inicio} />
                    <Field label="Fin" value={fin} />
                    <Field label="Cobro" value={cobro || "No especificada"} />
                    <Field label="Valor mensual" value={money || renant?.valorMensual} />
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Descripción</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-5">
                      {descripcionContrato || "Sin descripción"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Inmueble</h3>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {renant?.tipoInmueble ? <Pill tone="blue">{renant?.tipoInmueble}</Pill> : null}
                      {renant?.registroInmobiliario ? <Pill tone="gray">{renant?.registroInmobiliario}</Pill> : null}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-16 h-16 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                      {imageUrl && !imageFailed ? (
                        <img
                          src={imageUrl}
                          alt={renant?.nombreInmueble || "Inmueble arrendado"}
                          className="h-full w-full object-cover"
                          onError={() => setImageFailed(true)}
                        />
                      ) : (
                        <FaImage size={20} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {renant?.nombreInmueble || "Inmueble arrendado"}
                      </p>
                      <div className="mt-1.5 grid grid-cols-3 gap-2">
                        <Field label="Área" value={renant?.area ? `${renant?.area} m²` : "-"} />
                        <Field label="Hab." value={renant?.habitaciones ?? "-"} />
                        <Field label="Baños" value={banos} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
                    <Field label="Dirección" value={renant?.direccion || "-"} />
                    <Field
                      label="Ciudad/Dep"
                      value={(renant?.ciudad || "-") + (renant?.departamento ? `, ${renant?.departamento}` : "")}
                    />
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Arrendatario</h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field label="Documento" value={formatDocument(tipoDocArr, numeroDocArr)} />
                    <Field label="Teléfono" value={telefonoArr} />
                    <Field label="Correo" value={correoArr || "-"} />
                    <Field label="Nombre" value={nombreArr || "-"} className="col-span-2" />
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Codeudor</h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field label="Documento" value={formatDocument(tipoDocCod, numeroDocCod)} />
                    <Field label="Teléfono" value={telefonoCod} />
                    <Field label="Actividad económica" value={actividadEconomicaCod || "-"} />
                    <Field label="Correo" value={correoCod || "-"} />
                    <Field label="Nombre" value={nombreCod || "-"} className="col-span-2" />
                  </div>
                </section>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 sm:px-5 py-2.5 flex justify-end">
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
