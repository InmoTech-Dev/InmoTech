import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { FaUserPlus, FaSearch, FaHome, FaCalendar, FaDollarSign } from "react-icons/fa";
import { Plus, Search, Filter, Eye, ListChecks, Trash2, Home, Calendar, DollarSign, X, AlertCircle } from 'lucide-react';
import RenantForm from "../../components/leases/RenantForm";
import ViewRenant from "../../components/leases/ViewRenant"; 
import LeaseStatusModal from "../../components/leases/LeaseStatusModal";
import "../../../../shared/styles/globals.css";
import arriendoApiService from "../../../../shared/services/arriendoApiService";
import MESSAGES from "../../../../shared/constants/messages";
import { useToast } from "../../../../shared/hooks/use-toast";
import { uploadToCloudinary } from "../../../../shared/services/cloudinary";

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return `${numeric.toLocaleString("es-CO")} $`;
};

const normalizeDateString = (raw) => {
  if (!raw) return "";
  const str = String(raw);
  const isoMatch = str.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const slashMatch = str.match(/\d{4}\/\d{2}\/\d{2}/);
  if (slashMatch) return slashMatch[0].replace(/\//g, "-");
  const date = new Date(str);
  if (Number.isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const mapApiArriendoToRow = (arriendo = {}) => {
  const inmueble = arriendo.Inmueble || arriendo.inmueble || {};
  const arrendatario = arriendo.arrendatario || arriendo.Arrendatario || {};
  const persona = arrendatario.persona || arrendatario.Persona || {};
  const codeudor =
    arriendo.codeudor ||
    arriendo.Codeudor ||
    arriendo.codeudor_persona ||
    arriendo.codeudorPersona ||
    {};

  const codeudorPersona =
    codeudor.persona ||
    codeudor.Persona ||
    arriendo.codeudor_persona ||
    arriendo.codeudorPersona ||
    (codeudor.id_persona ? codeudor : {});

  const nombreCompletoBase = arrendatario.nombre_completo || persona.nombre_completo || "";
  const apellidosBase = arrendatario.apellido_completo || persona.apellido_completo || "";

  const [primerNombre = "", segundoNombre = ""] = nombreCompletoBase.split(" ");
  const [primerApellido = "", segundoApellido = ""] = apellidosBase.split(" ");

  const nombreCompletoCod = codeudor.nombre_completo || codeudorPersona.nombre_completo || "";
  const apellidosCod = codeudor.apellido_completo || codeudorPersona.apellido_completo || "";
  const [primerNombreCod = "", segundoNombreCod = ""] = nombreCompletoCod.split(" ");
  const [primerApellidoCod = "", segundoApellidoCod = ""] = apellidosCod.split(" ");

  const valor = arriendo.valor_mensual || arriendo.valor_arriendo || arriendo.valor_arriendo_mensual || arriendo.precio_arriendo || 0;
  const fechaInicio = normalizeDateString(arriendo.fecha_inicio || arriendo.fechaInicio || "");
  const fechaFin = normalizeDateString(arriendo.fecha_finalizacion || arriendo.fecha_fin || "");
  const cobros = arriendo.Cobros || arriendo.cobros || [];
  const cobroOrdenado = cobros
    .slice()
    .sort((a, b) => new Date(a.fecha_cobro) - new Date(b.fecha_cobro))[0];

  const fechaCobroRaw =
    arriendo.fecha_cobro ||
    arriendo.fechaCobro ||
    (cobroOrdenado && cobroOrdenado.fecha_cobro) ||
    fechaInicio;

  const fechaCobroStr = normalizeDateString(fechaCobroRaw);

  // Extraer comodidades para habitaciones y baÃ±os
  const comodidades = inmueble.comodidades || [];
  const habCom = comodidades.find(c => c.nombre === "Habitaciones");
  const banCom = comodidades.find(c => c.nombre === "BaÃ±os" || c.nombre === "BaÃƒÂ±os");
  const habCantidad = habCom?.Inmueble_Comodidades?.cantidad || habCom?.Inmueble_Comodidad?.cantidad || habCom?.cantidad || "";
  const banCantidad = banCom?.Inmueble_Comodidades?.cantidad || banCom?.Inmueble_Comodidad?.cantidad || banCom?.cantidad || "";

  const ultimoEstado =
    arriendo.ultimo_seguimiento_estado ||
    arriendo.ultimoSeguimientoEstado ||
    arriendo.seguimientos?.[0]?.estado ||
    "";

  const ultimoComentario =
    arriendo.ultimo_seguimiento_comentario ||
    arriendo.ultimoSeguimientoComentario ||
    arriendo.ultimo_seguimiento_descripcion ||
    arriendo.ultimoSeguimientoDescripcion ||
    arriendo.comentario ||
    arriendo.seguimientos?.[0]?.descripcion ||
    arriendo.seguimientos?.[0]?.comentario ||
    "";
  const ultimoDescripcion =
    arriendo.ultimo_seguimiento_descripcion ||
    arriendo.ultimoSeguimientoDescripcion ||
    arriendo.seguimientos?.[0]?.descripcion ||
    arriendo.comentario ||
    ultimoComentario;
  const descripcionContrato =
    arriendo.descripcion_contrato ||
    arriendo.descripcionContrato ||
    arriendo.descripcion ||
    arriendo.descripcion_garantia ||
    arriendo.observaciones ||
    arriendo.descripcionInmueble ||
    arriendo.descripcion_arriendo ||
    arriendo.descripcion_inmueble ||
    "";

  const ultimoFechaRaw =
    arriendo.ultimo_seguimiento_fecha ||
    arriendo.ultimoSeguimientoFecha ||
    arriendo.seguimientos?.[0]?.fecha_creacion ||
    "";
  const totalSeguimientos = arriendo.total_seguimientos ?? arriendo.totalSeguimientos ?? 0;

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
    fechaInicio: fechaInicio || "",
    fechaFinal: fechaFin || "",
    fechaCobro: fechaCobroStr || "No especificada",
    precio: formatCurrency(valor),
    descripcion: descripcionContrato,
    descripcionContrato,
    estado: arriendo.estado || "Pendiente",
    fechaLimite: "",
    valorMensual: formatCurrency(valor),
    ultimoSeguimientoEstado: ultimoEstado,
    ultimoSeguimientoComentario: ultimoComentario,
    ultimoSeguimientoDescripcion: ultimoDescripcion,
    ultimoSeguimientoFecha: ultimoFechaRaw ? String(ultimoFechaRaw).slice(0, 10) : "",
    totalSeguimientos,
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
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [uploadingPaymentId, setUploadingPaymentId] = useState(null);
  const { toast } = useToast();
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
      const rowsBase = list.map(mapApiArriendoToRow);
      // Ya no forzamos sincronizaciÃ³n automÃ¡tica de estado para respetar cambios manuales
      setArriendos(rowsBase);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: error?.message || MESSAGES.leaseContract.loadError
      });
      toast({
        title: "Error al cargar arriendos",
        description: error?.message || MESSAGES.leaseContract.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [setStatusMessage]);

  useEffect(() => {
    fetchArriendos();
  }, [fetchArriendos]);

  const loadPayments = useCallback(async (leaseId) => {
    if (!leaseId) return;
    setLoadingPayments(true);
    try {
      const response = await arriendoApiService.obtenerCobros(leaseId);
      const list = response?.data?.data || response?.data || [];
      setPayments(list);
    } catch (error) {
      toast({
        title: "Error al cargar cobros",
        description: error?.message || "No fue posible cargar los cobros de este arriendo",
        variant: "destructive",
      });
    } finally {
      setLoadingPayments(false);
    }
  }, [toast]);

  // CREAR NUEVO
  const handleNewRent = ({ renant, formData }) => {
    // Solo refrescamos desde API; crear arrendatario no debe agregar a la lista de arriendos
    fetchArriendos();
    setShowForm(false);
    setStatusMessage({ type: "success", message: MESSAGES.leaseContract.sync });
    toast({
      title: "Arriendo sincronizado",
      description: MESSAGES.leaseContract.sync,
      variant: "default",
    });
  };

  const openStatusModal = (rent) => {
    setStatusRent({
      ...rent,
      nuevoEstado: rent.estado || "Activo",
      comentario: "",
    });
    loadPayments(rent.id);
  };

  const closeStatusModal = () => {
    setStatusRent(null);
    setPayments([]);
    setUploadingPaymentId(null);
  };

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
      setStatusMessage({ type: "success", message: MESSAGES.leaseContract.stateUpdate });
      toast({
        title: "Estado actualizado",
        description: MESSAGES.leaseContract.stateUpdate,
        variant: "default",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: error?.response?.data?.message || error?.message || MESSAGES.leaseContract.stateError,
      });
      toast({
        title: "Error al actualizar estado",
        description: error?.response?.data?.message || error?.message || MESSAGES.leaseContract.stateError,
        variant: "destructive",
      });
    }
  };

  // 🗑️ ELIMINAR
  const [rentToDelete, setRentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRequest = (rent) => {
    setRentToDelete(rent);
  };

  const handleCancelDelete = () => setRentToDelete(null);

  const handleConfirmDelete = async () => {
    if (!rentToDelete) return;
    const id = rentToDelete.id;
    setIsDeleting(true);
    try {
      await arriendoApiService.eliminarArriendo(id);
      setArriendos((prev) => prev.filter((r) => r.id !== id));
      setStatusMessage({ type: "success", message: MESSAGES.leaseContract.delete });
      toast({
        title: "Arriendo eliminado",
        description: MESSAGES.leaseContract.delete,
        variant: "default",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: error?.response?.data?.message || error?.message || MESSAGES.leaseContract.deleteError,
      });
      toast({
        title: "Error al eliminar arriendo",
        description: error?.response?.data?.message || error?.message || MESSAGES.leaseContract.deleteError,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setRentToDelete(null);
    }
  };

  const handleUploadReceipt = async (payment, file, form) => {
    if (!statusRent) return;
    const paymentId = payment.id_cobro || payment.id;
    setUploadingPaymentId(paymentId);
    try {
      let montoPagado = Number(String(form.monto_pagado ?? "").replace(/[^0-9.-]/g, ""));
      if (!montoPagado || montoPagado <= 0) {
        const fallbackMonto = Number(payment.valor_pago || payment.valor_cobro || payment.valor || 0);
        montoPagado = fallbackMonto;
      }
      if (!montoPagado || montoPagado <= 0) {
        throw new Error("Ingresa un monto pagado mayor a cero.");
      }
      if (!form.fecha_pago) {
        throw new Error("Selecciona la fecha de pago.");
      }
      if (!form.entidad_bancaria?.trim()) {
        throw new Error("Ingresa la entidad bancaria.");
      }
      if (!form.referencia_bancaria?.trim()) {
        throw new Error("Ingresa la referencia bancaria.");
      }

      // Validar que la fecha de pago no sea futura (el backend tiene CHECK)
      if (form.fecha_pago) {
        const payDate = new Date(form.fecha_pago);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        payDate.setHours(0, 0, 0, 0);
        if (payDate > today) {
          throw new Error("La fecha de pago no puede ser futura. Usa una fecha igual o anterior a hoy.");
        }
      }
      // Usa carpeta permitida por backend (lista blanca en upload.controller)
      const upload = await uploadToCloudinary(file, { folder: 'inmotech/comprobantes' });
      const payload = {
        url_comprobante: upload.url,
        entidad_bancaria: form.entidad_bancaria,
        referencia_bancaria: form.referencia_bancaria,
        monto_pagado: montoPagado,
        fecha_pago: form.fecha_pago,
        // Estado debe coincidir con la restricción CHECK de la BD
        estado: 'En revisión',
        observaciones: form.observaciones,
      };
      await arriendoApiService.crearComprobante(statusRent.id, paymentId, payload);
      toast({
        title: "Comprobante registrado",
        description: "El comprobante se cargó y registró correctamente.",
        variant: "default",
      });
      await loadPayments(statusRent.id);
    } catch (error) {
      toast({
        title: "Error al subir comprobante",
        description: error?.message || "No fue posible registrar el comprobante.",
        variant: "destructive",
      });
    } finally {
      setUploadingPaymentId(null);
    }
  };

const renderDeleteModal = () => {
  if (!rentToDelete) return null;

  const nombre =
    rentToDelete?.primerNombreArrendatario ||
    rentToDelete?.arrendatario?.nombre_completo ||
    "";

  const modalContent = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop estilo formularios */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancelDelete}
      />

      {/* Modal card estilo formularios */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 border border-red-200">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Confirmar eliminación</h3>
              <p className="text-slate-600 mt-1 text-sm">Esta acción es irreversible.</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCancelDelete}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-slate-500" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-700">
            ¿Estás seguro de que deseas eliminar{" "}
            {nombre ? (
              <>
                el arriendo de{" "}
                <span className="font-semibold text-slate-900">{nombre}</span>
              </>
            ) : (
              <span className="font-semibold text-slate-900">este arriendo</span>
            )}
            ? Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6 rounded-b-2xl">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCancelDelete}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
              isDeleting
                ? "bg-slate-400 text-slate-200 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.getElementById("modal-root") || document.body
  );
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

  const parseDateSafe = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d) ? null : d;
  };

  const isContractActiveToday = (rent) => {
    const start = parseDateSafe(rent.fechaInicio);
    const end = parseDateSafe(rent.fechaFinal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start && today < start) return false;
    if (end && today > end) return false;
    return true;
  };

  const computeEstadoConCobro = (rent) => {
    const base = rent.estado || "Activo";
    if (base === "Finalizado" || base === "Pagado") return base;

    const fechaCobro = parseDateSafe(rent.fechaCobro);
    if (fechaCobro) {
      const cobroDay = new Date(fechaCobro);
      cobroDay.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (cobroDay < today) return "Debe";
    }
    return base;
  };

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

  // Calcular estadÃ­sticas
  const stats = {
    total: filteredRents.length,
    activos: filteredRents.filter(r => r.estado === 'Pagado' || r.estado === 'Activo').length,
    pendientes: filteredRents.filter(r => r.estado === 'Pendiente' || r.estado === 'Pendiente de inicio').length,
    totalMensual: filteredRents.reduce((sum, r) => {
      const valor = parseFloat(r.valorMensual.replace(/[^\d]/g, '')) || 0;
      return sum + valor;
    }, 0)
  };

  // ðŸ”‘ --- FUNCIONES PARA RENDERIZAR MODALES CON PORTAL ---
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

    return (
      <LeaseStatusModal
        statusRent={statusRent}
        estados={estados}
        onClose={closeStatusModal}
        onChangeEstado={(estado) => setStatusRent((prev) => ({ ...prev, nuevoEstado: estado }))}
        onChangeComentario={(comentario) => setStatusRent((prev) => ({ ...prev, comentario }))}
        onSave={handleStatusSave}
        payments={payments}
        loadingPayments={loadingPayments}
        onUploadReceipt={handleUploadReceipt}
        uploadingPaymentId={uploadingPaymentId}
      />
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

        {/* Banner removido: feedback ahora solo por toasts */}
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
                        <td className="px-6 py-4 text-center">{getEstadoBadge(computeEstadoConCobro(r))}</td>
                        
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


