import React, { useMemo } from "react";
import { FaImage, FaPhoneAlt, FaShieldAlt, FaTimes } from "react-icons/fa";
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
  if (["activo", "vigente", "pagad"].some((k) => e.includes(k))) return "green";
  if (["moros", "venc", "bloq"].some((k) => e.includes(k))) return "red";
  if (!estado) return "gray";
  return "yellow";
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-CO");
}

export default function ViewTenantModal({ tenant, onClose }) {
  const fullName = [tenant?.primerNombre, tenant?.segundoNombre, tenant?.primerApellido, tenant?.segundoApellido]
    .filter(Boolean)
    .join(" ")
    .trim();

  const raw = tenant?.raw || tenant?.arrendatarioRaw || tenant?.rawLease || {};

  const rawInmueble =
    raw.inmueble ||
    raw.Inmueble ||
    (Array.isArray(raw.arriendos) && raw.arriendos[0]?.Inmueble) ||
    (Array.isArray(raw.arriendosComoArrendatario) && raw.arriendosComoArrendatario[0]?.Inmueble) ||
    raw.InmuebleArrendado ||
    null;

  const inmuebleDirect =
    tenant?.inmueble ||
    rawInmueble ||
    (Array.isArray(tenant?.inmueblesArrendados) ? tenant.inmueblesArrendados[0] : null);

  const derivedInmueble =
    inmuebleDirect ||
    (tenant?.registroInmobiliario || tenant?.nombreInmueble || tenant?.direccion
      ? {
          registro: tenant?.registroInmobiliario || "-",
          categoria: tenant?.tipoInmueble || tenant?.categoria || "-",
          nombre: tenant?.nombreInmueble || tenant?.registroInmobiliario || tenant?.direccion || "Inmueble",
          direccion: tenant?.direccion || "-",
          ciudad: tenant?.ciudad || "",
          departamento: tenant?.departamento || "",
        }
      : null);

  const hasLeaseInfo =
    tenant?.fechaInicio ||
    tenant?.fechaFin ||
    tenant?.valorMensual ||
    tenant?.tipoGarantia ||
    tenant?.valorGarantia ||
    tenant?.descripcionGarantia ||
    tenant?.estadoContrato ||
    (tenant?.estado && `${tenant.estado}`.trim().toLowerCase() !== "activo");

  const rawCodeudor =
    raw.codeudor ||
    raw.Codeudor ||
    raw.codeudorPersona ||
    raw.codeudor_persona ||
    (Array.isArray(raw.arriendos) && raw.arriendos[0]?.codeudor) ||
    raw.codeudorArrendamiento ||
    {};

  const hasEmergencyContact =
    tenant?.contactoEmergenciaNombre ||
    tenant?.contactoEmergenciaTelefono ||
    tenant?.contactoEmergenciaParentesco ||
    tenant?.codeudorNombre ||
    tenant?.codeudorTelefono ||
    tenant?.codeudorCorreo ||
    rawCodeudor?.nombre_completo ||
    rawCodeudor?.telefono ||
    rawCodeudor?.correo;

  const emergencyName =
    tenant?.codeudorNombre ||
    rawCodeudor?.nombre_completo ||
    [tenant?.primerNombreCodeudor, tenant?.segundoNombreCodeudor, tenant?.primerApellidoCodeudor, tenant?.segundoApellidoCodeudor]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    tenant?.contactoEmergenciaNombre ||
    "-";

  const emergencyPhone =
    tenant?.codeudorTelefono ||
    tenant?.telefonoCodeudor ||
    rawCodeudor?.telefono ||
    tenant?.contactoEmergenciaTelefono ||
    "-";

  const emergencyRelation =
    tenant?.contactoEmergenciaParentesco || (tenant?.codeudorNombre || rawCodeudor?.nombre_completo ? "Codeudor" : "-");

  const emergencyEmail =
    tenant?.codeudorCorreo || tenant?.correoCodeudor || rawCodeudor?.correo || tenant?.contactoEmergenciaCorreo;

  const estadoLabel = tenant?.estado || tenant?.estadoContrato || "-";

  return (
    <AnimatePresence>
      {tenant && (
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
                    Información del arrendatario
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Resumen del arrendatario, su contrato y el inmueble asociado.
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
                {/* Información personal (organizada) */}
                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Información personal</h3>
                    <Pill tone={estadoTone(tenant?.estado)}>{estadoLabel}</Pill>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                    <Field label="Nombre" value={fullName || "-"} className="sm:col-span-2" />
                    <Field
                      label="Documento"
                      value={(tenant?.tipoDocumento ? `${tenant.tipoDocumento} - ` : "") + (tenant?.documento || "-")}
                    />
                    <Field
                      label="Teléfono"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <FaPhoneAlt className="text-gray-500" />
                          <span>{tenant?.telefono || "-"}</span>
                        </span>
                      }
                    />

                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-semibold text-gray-500">Correo</p>
                      <div className="mt-0.5 text-sm break-words">
                        {tenant?.correo ? (
                          <a href={`mailto:${tenant.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                            {tenant.correo}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Datos del arrendamiento */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Arrendamiento</h3>
                    {tenant?.valorMensual ? <Pill tone="green">{formatMoneyCOP(tenant.valorMensual)}</Pill> : <Pill>-</Pill>}
                  </div>

                  {hasLeaseInfo ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <Field label="Inicio" value={formatDateCompact(tenant?.fechaInicio)} />
                        <Field label="Fin" value={tenant?.fechaFin ? formatDateCompact(tenant.fechaFin) : "No definida"} />
                        <Field label="Canon mensual" value={formatMoneyCOP(tenant?.valorMensual)} />
                        <Field label="Estado contrato" value={tenant?.estadoContrato || tenant?.estado || "-"} />
                      </div>

                      {/* Bloque de garantía retirado a solicitud del usuario */}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <FaImage size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 italic text-sm">
                        Aún no se ha registrado un contrato de arrendamiento para este arrendatario.
                      </p>
                    </div>
                  )}
                </section>

                {/* Contacto emergencia / Codeudor */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Contacto de emergencia / Codeudor</h3>
                    <Pill>{hasEmergencyContact ? "Disponible" : "No registrado"}</Pill>
                  </div>

                  {hasEmergencyContact ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <Field label="Nombre" value={emergencyName} className="col-span-2" />
                      <Field label="Teléfono" value={emergencyPhone} />
                      <Field label="Parentesco" value={emergencyRelation} />
                      <Field
                        label="Correo"
                        value={
                          emergencyEmail ? (
                            <a
                              href={`mailto:${emergencyEmail}`}
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              {emergencyEmail}
                            </a>
                          ) : (
                            "-"
                          )
                        }
                        className="col-span-2"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FaImage size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 italic text-sm">
                        Aún no se ha agregado un contacto de emergencia para este arrendatario.
                      </p>
                    </div>
                  )}
                </section>

                {/* Inmueble */}
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Inmueble arrendado</h3>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {derivedInmueble?.categoria ? <Pill tone="blue">{derivedInmueble.categoria}</Pill> : null}
                      {derivedInmueble?.registro ? <Pill>{derivedInmueble.registro}</Pill> : null}
                    </div>
                  </div>

                  {derivedInmueble ? (
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-40 h-28 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                        <FaImage size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          <Field label="Nombre" value={derivedInmueble.nombre || "Inmueble"} className="col-span-2" />
                          <Field
                            label="Registro"
                            value={
                              derivedInmueble.registro ||
                              derivedInmueble.registro_inmobiliario ||
                              derivedInmueble.registroInmobiliario ||
                              tenant?.registroInmobiliario ||
                              raw?.registro_inmobiliario ||
                              "-"
                            }
                          />
                          <Field label="Categoría" value={derivedInmueble.categoria || "-"} />
                          <Field label="Dirección" value={derivedInmueble.direccion || "-"} className="col-span-2" />
                          <Field
                            label="Ubicación"
                            value={[derivedInmueble.ciudad, derivedInmueble.departamento].filter(Boolean).join(", ") || "-"}
                            className="col-span-2"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FaImage size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 italic text-sm">
                        Aún no se ha vinculado un inmueble a este arrendatario.
                      </p>
                    </div>
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
