import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { FaUserPlus, FaSearch, FaHome, FaCalendar, FaDollarSign } from "react-icons/fa";
import { Plus, Search, Filter, Eye, ListChecks, Trash2, Home, Calendar, DollarSign, X } from 'lucide-react';
import RenantForm from "../../components/leases/RenantForm";
import ViewRenant from "../../components/leases/ViewRenant"; 
import "../../../../shared/styles/globals.css";
import arriendoApiService from "../../../../shared/services/arriendoApiService";

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return `${numeric.toLocaleString("es-CO")} $`;
};

const mapApiArriendoToRow = (arriendo = {}) => {
  const inmueble = arriendo.Inmueble || arriendo.inmueble || {};
  const arrendatario = arriendo.arrendatario || arriendo.Arrendatario || {};
  const persona = arrendatario.persona || arrendatario.Persona || {};
  const codeudor = arriendo.codeudor || arriendo.Codeudor || {};
  const codeudorPersona = codeudor.persona || codeudor.Persona || (codeudor.id_persona ? codeudor : {});

  const nombreCompletoBase = arrendatario.nombre_completo || persona.nombre_completo || "";
  const apellidosBase = arrendatario.apellido_completo || persona.apellido_completo || "";

  const [primerNombre = "", segundoNombre = ""] = nombreCompletoBase.split(" ");
  const [primerApellido = "", segundoApellido = ""] = apellidosBase.split(" ");

  const nombreCompletoCod = codeudor.nombre_completo || codeudorPersona.nombre_completo || "";
  const apellidosCod = codeudor.apellido_completo || codeudorPersona.apellido_completo || "";
  const [primerNombreCod = "", segundoNombreCod = ""] = nombreCompletoCod.split(" ");
  const [primerApellidoCod = "", segundoApellidoCod = ""] = apellidosCod.split(" ");

  const valor = arriendo.valor_mensual || arriendo.valor_arriendo || arriendo.valor_arriendo_mensual || arriendo.precio_arriendo || 0;
  const fechaInicio = arriendo.fecha_inicio || "";
  const fechaFin = arriendo.fecha_finalizacion || arriendo.fecha_fin || "";

  // Extraer comodidades para habitaciones y baños
  const comodidades = inmueble.comodidades || [];
  const habCom = comodidades.find(c => c.nombre === "Habitaciones");
  const banCom = comodidades.find(c => c.nombre === "Baños" || c.nombre === "BaÃ±os");
  const habCantidad = habCom?.Inmueble_Comodidades?.cantidad || habCom?.Inmueble_Comodidad?.cantidad || habCom?.cantidad || "";
  const banCantidad = banCom?.Inmueble_Comodidades?.cantidad || banCom?.Inmueble_Comodidad?.cantidad || banCom?.cantidad || "";

  return {
    id: arriendo.id_arrendamiento || arriendo.id_arriendo || arriendo.id || Date.now(),
    arrendatarioId: arrendatario.id_arrendatario || arrendatario.id,
    arrendatarioPersona: persona,
    arrendatarioRaw: arrendatario,
    codeudor, // para que ViewRenant lo tenga directo
    codeudorPersona,
    codeudorRaw: codeudor,
    tipoDocArrendatario: arrendatario.tipo_documento || persona.tipo_documento || "",
    numeroDocArrendatario: arrendatario.numero_documento || persona.numero_documento || "",
    primerNombreArrendatario: primerNombre,
    segundoNombreArrendatario: segundoNombre,
    primerApellidoArrendatario: primerApellido,
    segundoApellidoArrendatario: segundoApellido,
    correoArrendatario: arrendatario.correo || persona.correo || "",
    telefonoArrendatario: arrendatario.telefono || persona.telefono || "",
    tipoDocCodeudor: codeudor.tipo_documento || codeudorPersona.tipo_documento || "",
    numeroDocCodeudor: codeudor.numero_documento || codeudorPersona.numero_documento || "",
    primerNombreCodeudor: primerNombreCod,
    segundoNombreCodeudor: segundoNombreCod,
    primerApellidoCodeudor: primerApellidoCod,
    segundoApellidoCodeudor: segundoApellidoCod,
    correoCodeudor: codeudor.correo || codeudorPersona.correo || "",
    telefonoCodeudor: codeudor.telefono || codeudorPersona.telefono || "",
    tipoInmueble: inmueble.categoria || inmueble.tipo || "",
    registroInmobiliario: inmueble.registro_inmobiliario || inmueble.registro || "",
    nombreInmueble: inmueble.nombre || inmueble.titulo || "",
    area: inmueble.area_construida || inmueble.area_terreno || inmueble.m2 || "",
    habitaciones: habCantidad || inmueble.habitaciones || "",
    banos: banCantidad || inmueble.banos || "",
    departamento: inmueble.departamento || "",
    ciudad: inmueble.ciudad || "",
    barrio: inmueble.barrio || "",
    estrato: inmueble.estrato || "",
    direccion: inmueble.direccion || "",
    precioInmueble: formatCurrency(inmueble.precio_arriendo || inmueble.precio || valor),
    fechaInicio: fechaInicio ? String(fechaInicio).slice(0, 10) : "",
    fechaFinal: fechaFin ? String(fechaFin).slice(0, 10) : "",
    fechaCobro: "",
    precio: formatCurrency(valor),
    estado: arriendo.estado || "Pendiente",
    fechaLimite: "",
    valorMensual: formatCurrency(valor),
  };
};

export function RenantManagementPage() {
  const [arriendos, setArriendos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewingRent, setViewingRent] = useState(null);
  const [statusRent, setStatusRent] = useState(null); // arriendo en seguimiento (solo estado)
  const [statusMessage, setStatusMessage] = useState(null);
  const fetchArriendos = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await arriendoApiService.obtenerArriendos();
      const list = response?.data?.data || response?.data || [];
      // DEBUG: inspeccionar payload de backend para arrendatario/persona
      if (list.length) {
        // eslint-disable-next-line no-console
        console.log("DBG leases sample", list[0]);
      }
      setArriendos(list.map(mapApiArriendoToRow));
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: error?.message || "No fue posible cargar los arrendatarios"
      });
    } finally {
      setIsLoading(false);
    }
  }, [setStatusMessage]);

  useEffect(() => {
    fetchArriendos();
  }, [fetchArriendos]);

  // CREAR NUEVO
  const handleNewRent = ({ renant, formData }) => {
    // Solo refrescamos desde API; crear arrendatario no debe agregar a la lista de arriendos
    fetchArriendos();
    setShowForm(false);
    setStatusMessage({ type: "success", message: "Arriendo sincronizado con la API" });
  };

  const openStatusModal = (rent) => {
    setStatusRent({
      ...rent,
      nuevoEstado: rent.estado || "Activo",
      comentario: "",
    });
  };

  const closeStatusModal = () => setStatusRent(null);

  const handleStatusSave = async () => {
    if (!statusRent) return;
    const { id, nuevoEstado, comentario } = statusRent;
    try {
      setStatusMessage(null);
      await arriendoApiService.actualizarEstado(id, {
        estado: nuevoEstado,
        comentario: comentario?.trim() || undefined,
      });
      await fetchArriendos();
      closeStatusModal();
      setStatusMessage({ type: "success", message: "Estado del arriendo actualizado" });
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: error?.response?.data?.message || error?.message || "No se pudo actualizar el estado",
      });
    }
  };

  // 🗑️ ELIMINAR
  const handleDelete = async (id) => {
    // No hay endpoint de borrado de arriendos en uso; removemos local y refrescamos
    if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
    setArriendos((prev) => prev.filter((r) => r.id !== id));
    setStatusMessage({ type: "info", message: "Arriendo removido de la lista local. Refresca si persiste." });
  };

  const filteredRents =
    searchTerm.trim() === ""
      ? arriendos
      : arriendos.filter((r) => {
          const lower = searchTerm.toLowerCase();
          return (
            r.registroInmobiliario.includes(searchTerm) ||
            r.tipoInmueble.toLowerCase().includes(lower) ||
            r.estado.toLowerCase().includes(lower) ||
            r.fechaInicio.includes(searchTerm) ||
            r.fechaFinal.includes(searchTerm) ||
            r.primerNombreArrendatario.toLowerCase().includes(lower) ||
            r.primerApellidoArrendatario.toLowerCase().includes(lower) ||
            r.numeroDocArrendatario.includes(searchTerm) ||
            r.correoArrendatario.toLowerCase().includes(lower)
          );
        });

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "Pagado":
      case "Activo":
        return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-400">{estado}</span>;
      case "Pendiente":
      case "Pendiente de inicio":
        return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-400">{estado}</span>;
      case "Debe":
      case "Finalizado":
        return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-400">{estado}</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">{estado}</span>;
    }
  };

  // Calcular estadísticas
  const stats = {
    total: filteredRents.length,
    activos: filteredRents.filter(r => r.estado === 'Pagado' || r.estado === 'Activo').length,
    pendientes: filteredRents.filter(r => r.estado === 'Pendiente' || r.estado === 'Pendiente de inicio').length,
    totalMensual: filteredRents.reduce((sum, r) => {
      const valor = parseFloat(r.valorMensual.replace(/[^\d]/g, '')) || 0;
      return sum + valor;
    }, 0)
  };

  // 🔑 --- FUNCIONES PARA RENDERIZAR MODALES CON PORTAL ---
  const renderFormModal = () => {
    if (!showForm) return null;

    const modalContent = (
      <RenantForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
        }}
        onSubmit={handleNewRent}
      />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  const renderViewModal = () => {
    if (!viewingRent) return null;

    const modalContent = (
      <ViewRenant renant={viewingRent} onClose={() => setViewingRent(null)} />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  const renderStatusModal = () => {
    if (!statusRent) return null;
    const estados = ["Activo", "Al día", "Pendiente", "Recuperación", "Finalizado", "Cancelado"];

    const modalContent = (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Seguimiento de Arriendo</h2>
              <p className="text-sm text-gray-500 mt-1">
                Cambia únicamente el estado del contrato. Los demás datos son de solo lectura.
              </p>
            </div>
            <button
              onClick={closeStatusModal}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">Arrendatario:</span>
              <span>{statusRent.primerNombreArrendatario} {statusRent.primerApellidoArrendatario}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Inmueble:</span>
              <span>{statusRent.tipoInmueble} · {statusRent.registroInmobiliario}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Periodo:</span>
              <span>{statusRent.fechaInicio} – {statusRent.fechaFinal}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Estado del arriendo
              <select
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusRent.nuevoEstado}
                onChange={(e) => setStatusRent((prev) => ({ ...prev, nuevoEstado: e.target.value }))}
              >
                {estados.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Comentario (opcional)
              <textarea
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Ej: Pago recibido, se cambia a 'Al día'"
                value={statusRent.comentario}
                onChange={(e) => setStatusRent((prev) => ({ ...prev, comentario: e.target.value }))}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={closeStatusModal}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md"
              onClick={handleStatusSave}
            >
              Guardar estado
            </button>
          </div>
        </div>
      </div>
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root') || document.body
    );
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* HEADER CON NUEVO ESTILO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Arriendos</h1>
            <p className="text-slate-600 mt-1">Administra todos los contratos de arrendamiento de tus propiedades</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setStatusMessage(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Nuevo Arriendo
          </motion.button>
        </motion.div>

        {statusMessage && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm mt-4 ${
              statusMessage.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {statusMessage.message}
          </div>
        )}
        {/* SEARCH AND FILTERS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        >
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar arrendatario por nombre, apellido, doc, reg. inmobiliario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150 shadow-sm bg-white"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </motion.button>
          </div>
        </motion.div>

        {/* CONTENT AREA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* TABLA CON ESTILO UNIFICADO */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Arrendatario</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Inmueble</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Registro</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Inicio / Fin</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Mensual</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Home className="w-8 h-8 text-slate-400 animate-pulse" />
                          <p>Cargando arriendos...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRents.length > 0 ? (
                    filteredRents.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* ARRENDATARIO */}
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <strong className="text-slate-800 block">{r.primerNombreArrendatario} {r.primerApellidoArrendatario}</strong>
                            <p className="text-sm text-slate-500">{r.correoArrendatario}</p>
                          </div>
                        </td>
                        
                        {/* INMUEBLE */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Home className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700">{r.tipoInmueble}</span>
                          </div>
                        </td>
                        
                        {/* REGISTRO */}
                        <td className="px-6 py-4 text-center text-slate-600 text-sm">{r.registroInmobiliario}</td>
                        
                        {/* FECHAS */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm text-slate-700">{r.fechaInicio}</span>
                            <span className="text-xs text-slate-500">a {r.fechaFinal}</span>
                          </div>
                        </td>
                        
                        {/* VALOR MENSUAL */}
                        <td className="px-6 py-4 text-center font-semibold text-purple-700">{r.valorMensual}</td>
                        
                        {/* ESTADO */}
                        <td className="px-6 py-4 text-center">{getEstadoBadge(r.estado)}</td>
                        
                        {/* ACCIONES */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label="Ver arriendo"
                              className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded-lg hover:bg-blue-50"
                              onClick={() => setViewingRent(r)}
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label="Seguimiento de arriendo"
                              className="text-amber-600 hover:text-amber-800 transition-colors p-1 rounded-lg hover:bg-amber-50"
                              onClick={() => openStatusModal(r)}
                            >
                              <ListChecks className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label="Eliminar arriendo"
                              className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-lg hover:bg-red-50"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-8 text-center text-slate-500 border-b"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Home className="w-8 h-8 text-slate-400" />
                          <p>No se encontraron arriendos.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODALES CON PORTAL */}
      {renderFormModal()}
      {renderViewModal()}
      {renderStatusModal()}
    </>
  );
}
