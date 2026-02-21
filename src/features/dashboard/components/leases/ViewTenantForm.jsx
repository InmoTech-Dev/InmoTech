import React from "react";
import { FaImage, FaPhoneAlt, FaShieldAlt } from "react-icons/fa";

const formatCurrency = (value) => {
  if (!value && value !== 0) return "-";
  return Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value));
};

export default function ViewTenantModal({ tenant, onClose }) {
  if (!tenant) return null;

  const fullName = [tenant.primerNombre, tenant.segundoNombre, tenant.primerApellido, tenant.segundoApellido]
    .filter(Boolean)
    .join(" ");

  const inmueble = tenant.inmueble || null;
  const hasLeaseInfo =
    tenant.fechaInicio ||
    tenant.fechaFin ||
    tenant.valorMensual ||
    tenant.tipoGarantia ||
    tenant.valorGarantia ||
    tenant.descripcionGarantia ||
    (tenant.estado && `${tenant.estado}`.trim().toLowerCase() !== "activo");
  const hasEmergencyContact =
    tenant.contactoEmergenciaNombre || tenant.contactoEmergenciaTelefono || tenant.contactoEmergenciaParentesco;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-blue-600 transition duration-150 p-1 rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Información del arrendatario</h2>
            <p className="text-sm text-gray-600">
              Resumen del arrendatario, su contrato y el inmueble asociado.
            </p>
          </div>

          {/* Información personal */}
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información personal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Nombre completo:</p>
                <p className="text-gray-900">{fullName || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Documento:</p>
                <p className="text-gray-900">
                  {tenant.tipoDocumento} - {tenant.documento}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <FaPhoneAlt className="text-gray-500" />
                <div>
                  <p className="font-semibold text-gray-700">Teléfono:</p>
                  <p className="text-gray-900">{tenant.telefono || "-"}</p>
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="font-semibold text-gray-700">Correo electrónico:</p>
                {tenant.correo ? (
                  <a href={`mailto:${tenant.correo}`} className="text-blue-600 hover:text-blue-800 underline">
                    {tenant.correo}
                  </a>
                ) : (
                  <p className="text-gray-900">-</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700">Estado:</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                    tenant.estado === "Activo"
                      ? "bg-green-100 text-green-700 border-green-400"
                      : tenant.estado === "Moroso"
                      ? "bg-red-100 text-red-700 border-red-400"
                      : "bg-yellow-100 text-yellow-700 border-yellow-400"
                  }`}
                >
                  {tenant.estado}
                </span>
              </div>
            </div>
          </section>

          {/* Datos de arrendamiento */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Datos del arrendamiento</h3>
            {hasLeaseInfo ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Fecha inicio:</p>
                    <p className="text-gray-900">
                      {tenant.fechaInicio ? new Date(tenant.fechaInicio).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Fecha fin:</p>
                    <p className="text-gray-900">
                      {tenant.fechaFin ? new Date(tenant.fechaFin).toLocaleDateString() : "No definida"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Canon mensual:</p>
                    <p className="text-gray-900 font-semibold">{formatCurrency(tenant.valorMensual)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mt-4">
                  <div className="flex items-center gap-2">
                    <FaShieldAlt className="text-gray-500" />
                    <div>
                      <p className="font-semibold text-gray-700">Tipo de garantía:</p>
                      <p className="text-gray-900">{tenant.tipoGarantia || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Valor garantía:</p>
                    <p className="text-gray-900">
                      {tenant.valorGarantia ? formatCurrency(tenant.valorGarantia) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Estado del contrato:</p>
                    <p className="text-gray-900">{tenant.estado || "-"}</p>
                  </div>
                </div>

                {tenant.descripcionGarantia && (
                  <div className="mt-4 text-sm">
                    <p className="font-semibold text-gray-700 mb-1">Descripción de la garantía:</p>
                    <p className="text-gray-900 bg-white rounded-lg p-3 border border-gray-200">
                      {tenant.descripcionGarantia}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <FaImage size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 italic">
                  Aún no se ha registrado un contrato de arrendamiento para este arrendatario.
                </p>
              </div>
            )}
          </section>

          {/* Contacto emergencia */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contacto de emergencia</h3>
            {hasEmergencyContact ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Nombre:</p>
                  <p className="text-gray-900">{tenant.contactoEmergenciaNombre || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Teléfono:</p>
                  <p className="text-gray-900">{tenant.contactoEmergenciaTelefono || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Parentesco:</p>
                  <p className="text-gray-900">{tenant.contactoEmergenciaParentesco || "-"}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <FaImage size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 italic">
                  Aún no se ha agregado un contacto de emergencia para este arrendatario.
                </p>
              </div>
            )}
          </section>

          {/* Inmueble */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Inmueble arrendado</h3>

            {inmueble ? (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0 w-full md:w-40 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                  <FaImage size={28} />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Registro:</p>
                    <p className="text-gray-900">{inmueble.registro || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Categoría:</p>
                    <p className="text-gray-900">{inmueble.categoria || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="font-semibold text-gray-700">Dirección:</p>
                    <p className="text-gray-900">{inmueble.direccion || "-"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Ubicación:</p>
                    <p className="text-gray-900">
                      {[inmueble.ciudad, inmueble.departamento].filter(Boolean).join(", ") || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Estado:</p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${
                        inmueble.estado === "Activo"
                          ? "bg-green-100 text-green-700 border-green-400"
                          : "bg-yellow-100 text-yellow-700 border-yellow-400"
                      }`}
                    >
                      {inmueble.estado}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <FaImage size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 italic">Aún no se ha vinculado un inmueble a este arrendatario.</p>
              </div>
            )}
          </section>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
