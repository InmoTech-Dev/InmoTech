import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { motion } from 'framer-motion';
import { FaUserPlus, FaSearch, FaHome, FaPhone, FaEnvelope } from "react-icons/fa";
import { Plus, Search, Filter, Eye, Edit, Home, Phone, Mail, X, ChevronDown } from 'lucide-react';
import "../../../../shared/styles/globals.css";
import LeasesPersonForm from "../../components/leases/TenantForm";
import ViewTenantModal from "../../components/leases/ViewTenantForm";
import { renantsApiService } from "../../../../shared/services/arrendatarioApiService";
import arriendoApiService from "../../../../shared/services/arriendoApiService";
import MESSAGES from "../../../../shared/constants/messages";
import { useToast } from "../../../../shared/hooks/use-toast";

const normalizeEstado = (estado = "") => (estado || "").toString().trim().toLowerCase();

export function LeasesManagementPage() {
  const [arrendatarios, setArrendatarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState(null);
  const [tenantToView, setTenantToView] = useState(null);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [statusChangingId, setStatusChangingId] = useState(null);
  const [statusMenuId, setStatusMenuId] = useState(null);
  const { toast } = useToast();
  const handleViewTenant = async (tenant) => {
    if (!tenant) return;
    // Optimistic show basic data
    setTenantToView(tenant);
    try {
      const full = await renantsApiService.getById(tenant.id || tenant.id_arrendatario || tenant.personaId);

      // Obtener arriendos para este arrendatario (reutilizamos mapping de compradores)
      const tenantId =
        full.id_arrendatario ||
        full.id_cliente ||
        full.idCliente ||
        full.id ||
        full.personaId ||
        tenant.id_arrendatario ||
        tenant.id ||
        tenant.personaId;

      let leaseData = {};
      const pickBestLease = (arrList = []) => {
        const matches = arrList.filter((a) => {
          const arr = a.arrendatario || a.Arrendatario || {};
          const persona = arr.persona || arr.Persona || {};
          const ids = [
            arr.id_arrendatario,
            arr.id,
            arr.idCliente,
            arr.id_cliente,
            persona.id_persona,
          ].filter(Boolean);
          return ids.includes(tenantId);
        });
        if (!matches.length) return null;
        // elegir el más reciente por fecha_inicio
        return matches
          .map((m) => ({
            m,
            ts: new Date(m.fecha_inicio || m.fechaInicio || m.fecha_cobro || m.fechaCobro || 0).getTime(),
          }))
          .sort((a, b) => b.ts - a.ts)[0].m;
      };

      if (tenant.rawLease) {
        leaseData = mapArriendoToLeaseData(tenant.rawLease);
      } else {
        try {
          const arriendosResp = await arriendoApiService.obtenerArriendos();
          const arriendosList = arriendosResp?.data?.data || arriendosResp?.data || arriendosResp || [];
          const match = pickBestLease(arriendosList);
          if (match) {
            leaseData = mapArriendoToLeaseData(match);
          }
        } catch (_err) {
          // si falla la carga de arriendos, seguimos mostrando datos básicos
        }
      }

      const merged = {
        ...tenant,
        ...full,
        ...leaseData,
      };
      // Conservar inmueble y codeudor si el detalle no los trae
      if (!merged.inmueble && tenant.inmueble) merged.inmueble = tenant.inmueble;
      if ((!merged.inmueblesArrendados || merged.inmueblesArrendados.length === 0) && tenant.inmueblesArrendados) {
        merged.inmueblesArrendados = tenant.inmueblesArrendados;
      }
      merged.codeudorNombre = merged.codeudorNombre || tenant.codeudorNombre;
      merged.codeudorTelefono = merged.codeudorTelefono || tenant.codeudorTelefono;
      merged.codeudorCorreo = merged.codeudorCorreo || tenant.codeudorCorreo;
      merged.primerNombreCodeudor = merged.primerNombreCodeudor || tenant.primerNombreCodeudor;
      merged.segundoNombreCodeudor = merged.segundoNombreCodeudor || tenant.segundoNombreCodeudor;
      merged.primerApellidoCodeudor = merged.primerApellidoCodeudor || tenant.primerApellidoCodeudor;
      merged.segundoApellidoCodeudor = merged.segundoApellidoCodeudor || tenant.segundoApellidoCodeudor;
      merged.telefonoCodeudor = merged.telefonoCodeudor || tenant.telefonoCodeudor;
      merged.correoCodeudor = merged.correoCodeudor || tenant.correoCodeudor;
      setTenantToView(merged);
    } catch (error) {
      console.error("No se pudo cargar el detalle del arrendatario", error);
      // Keep basic tenant data already set
    }
  };

  const handleToggleEstado = async (tenant, forcedEstado) => {
    if (!tenant) return;
    const targetId = tenant.id || tenant.id_arrendatario || tenant.personaId;
    if (!targetId) {
      setStatusMessage({ type: "error", message: "No se pudo identificar el arrendatario." });
      return;
    }
    const current = normalizeEstado(tenant.estado || "Activo");
    const nextEstado = forcedEstado || (current === "activo" ? "Inactivo" : "Activo");
    try {
      setStatusChangingId(targetId);
      const payload = {
        estado: nextEstado,
        tipoDocumento: tenant.tipoDocumento || tenant.persona?.tipo_documento || "CC",
        documento: tenant.documento || tenant.persona?.numero_documento || "",
        primerNombre: tenant.primerNombre || tenant.primerNombreArrendatario || "",
        segundoNombre: tenant.segundoNombre || tenant.segundoNombreArrendatario || "",
        primerApellido: tenant.primerApellido || tenant.primerApellidoArrendatario || "",
        segundoApellido: tenant.segundoApellido || tenant.segundoApellidoArrendatario || "",
        correo: tenant.correo || tenant.correoArrendatario || "",
        telefono: tenant.telefono || tenant.telefonoArrendatario || "",
      };
      const updated = await renantsApiService.update(targetId, payload);
      setArrendatarios((prev) =>
        prev.map((t) =>
          (t.id === targetId || t.id_arrendatario === targetId || t.personaId === targetId)
            ? { ...t, estado: updated.estado || nextEstado }
            : t
        )
      );
      toast({
        title: "Estado actualizado",
        description: `El arrendatario ahora está ${nextEstado}.`,
        variant: "default",
      });
      setStatusMenuId(null);
    } catch (error) {
      const errMsg = error.message || "No se pudo cambiar el estado del arrendatario";
      setStatusMessage({ type: "error", message: errMsg });
      toast({
        title: "Error al cambiar estado",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setStatusChangingId(null);
    }
  };

  const mapArriendoToLeaseData = (arriendo = {}) => {
    const inmueble = arriendo.Inmueble || arriendo.inmueble || {};
    const codeudor = arriendo.codeudor || arriendo.Codeudor || {};
    const codeudorPersona = codeudor.persona || codeudor.Persona || codeudor;
    const inmuebleNombre =
      inmueble.nombre ||
      inmueble.titulo ||
      inmueble.registro_inmobiliario ||
      inmueble.registro ||
      inmueble.direccion ||
      null;
    const inmuebleRegistro = inmueble.registro_inmobiliario || inmueble.registro || null;
    const inmuebleDireccion = inmueble.direccion || null;
    const inmuebleId = inmueble.id || inmueble.id_inmueble || null;
    const inmuebleSimple =
      inmuebleNombre || inmuebleRegistro || inmuebleId
        ? [
            {
              id: inmuebleId,
              nombre: inmuebleNombre || "Inmueble",
              direccion: inmuebleDireccion || "",
              registro: inmuebleRegistro || "",
            },
          ]
        : [];
    return {
      inmueble,
      inmueblesArrendados: inmuebleSimple,
      registroInmobiliario: inmuebleRegistro,
      tipoInmueble: inmueble.categoria || inmueble.tipo || null,
      nombreInmueble: inmuebleNombre,
      direccion: inmuebleDireccion,
      ciudad: inmueble.ciudad || null,
      departamento: inmueble.departamento || null,
      valorMensual: arriendo.valor_mensual || arriendo.valor_arriendo || arriendo.precio_arriendo || null,
      fechaInicio: arriendo.fecha_inicio || arriendo.fechaInicio || null,
      fechaFin: arriendo.fecha_finalizacion || arriendo.fecha_fin || arriendo.fechaFin || null,
      estadoContrato: arriendo.estado || null,
      tipoGarantia: arriendo.tipo_garantia || arriendo.tipoGarantia || null,
      valorGarantia: arriendo.valor_garantia || arriendo.valorGarantia || null,
      descripcionGarantia: arriendo.descripcion_garantia || arriendo.descripcionGarantia || arriendo.descripcion || null,
      codeudorNombre: codeudorPersona.nombre_completo || null,
      codeudorTelefono: codeudorPersona.telefono || null,
      codeudorCorreo: codeudorPersona.correo || null,
      primerNombreCodeudor: codeudorPersona.primer_nombre || null,
      segundoNombreCodeudor: codeudorPersona.segundo_nombre || null,
      primerApellidoCodeudor: codeudorPersona.primer_apellido || null,
      segundoApellidoCodeudor: codeudorPersona.segundo_apellido || null,
      rawLease: arriendo,
    };
  };

    const fetchTenants = async () => {
        try {
            setIsLoading(true);
            const [tenants, arriendosResp] = await Promise.all([
                renantsApiService.getAll(),
                arriendoApiService.obtenerArriendos().catch(() => ({ data: { data: [] } }))
      ]);

      const arriendosList = arriendosResp?.data?.data || arriendosResp?.data || arriendosResp || [];

      const merged = tenants.map((t) => {
        const tenantId = t.id || t.personaId;
        const match = arriendosList.find((a) => {
          const arrendatario = a.arrendatario || a.Arrendatario || {};
          const persona = arrendatario.persona || arrendatario.Persona || {};
          return (
            arrendatario.id_arrendatario === tenantId ||
            arrendatario.id === tenantId ||
            persona.id_persona === tenantId
          );
        });
        if (!match) return t;
        const leaseData = mapArriendoToLeaseData(match);
        return { ...t, ...leaseData, rawLease: match };
      });

      setArrendatarios(merged);
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: error.message || "No fue posible obtener los arrendatarios"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    if (!searchTerm.trim()) return arrendatarios;
    const lower = searchTerm.toLowerCase();
    return arrendatarios.filter((tenant) => {
      return (
        tenant.primerNombre.toLowerCase().includes(lower) ||
        (tenant.segundoNombre && tenant.segundoNombre.toLowerCase().includes(lower)) ||
        tenant.primerApellido.toLowerCase().includes(lower) ||
        (tenant.segundoApellido && tenant.segundoApellido.toLowerCase().includes(lower)) ||
        tenant.documento.includes(searchTerm) ||
        tenant.correo.toLowerCase().includes(lower) ||
        tenant.telefono.includes(searchTerm)
      );
    });
  }, [arrendatarios, searchTerm]);

  const handleCloseForm = () => {
    setShowForm(false);
    setTenantToEdit(null);
  };

  const handleCreateTenant = async (formData) => {
    setFormSubmitting(true);
    try {
      const newTenant = await renantsApiService.create(formData);
      setArrendatarios((prev) => [newTenant, ...prev]);
      toast({ title: "Arrendatario creado", description: MESSAGES.leaseTenant.create, variant: "default" });
      handleCloseForm();
    } catch (error) {
      toast({
        title: "Error al crear arrendatario",
        description: error.message || MESSAGES.leaseTenant.createError,
        variant: "destructive",
      });
      throw error;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateTenant = async (formData) => {
    if (!tenantToEdit) return;
    setFormSubmitting(true);
    try {
      const updated = await renantsApiService.update(tenantToEdit.id, formData);
      setArrendatarios((prev) => prev.map((tenant) => (tenant.id === updated.id ? updated : tenant)));
      toast({ title: "Arrendatario actualizado", description: MESSAGES.leaseTenant.update, variant: "default" });
      handleCloseForm();
    } catch (error) {
      toast({
        title: "Error al actualizar arrendatario",
        description: error.message || MESSAGES.leaseTenant.updateError,
        variant: "destructive",
      });
      throw error;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSubmit = (formData) => {
    if (tenantToEdit) {
      return handleUpdateTenant(formData);
    }
    return handleCreateTenant(formData);
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    try {
      const removedTenant = await renantsApiService.delete(tenantToDelete.id);
      const removedId = removedTenant?.id ?? tenantToDelete.id;
      setArrendatarios((prev) => prev.filter((tenant) => tenant.id !== removedId));
      toast({ title: "Arrendatario eliminado", description: MESSAGES.leaseTenant.delete, variant: "default" });
    } catch (error) {
      toast({
        title: "Error al eliminar arrendatario",
        description: error.message || MESSAGES.leaseTenant.deleteError,
        variant: "destructive",
      });
    } finally {
      setTenantToDelete(null);
    }
  };

  // Calcular estadísticas
  const stats = {
    total: filteredTenants.length,
    activos: filteredTenants.filter(t => normalizeEstado(t.estado) === 'activo').length,
    morosos: filteredTenants.filter(t => normalizeEstado(t.estado) === 'moroso').length,
    conInmuebles: filteredTenants.filter(t => t.inmueblesArrendados && t.inmueblesArrendados.length > 0).length
  };

  const renderFormModal = () => {
    if (!showForm) return null;

    const modalContent = (
      <LeasesPersonForm
        onSubmit={handleSubmit}
        onClose={handleCloseForm}
        nextId={arrendatarios.length + 1}
        initialData={tenantToEdit}
        isSubmitting={formSubmitting}
      />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById("modal-root") || document.body
    );
  };

  const renderViewModal = () => {
    if (!tenantToView) return null;
    const modalContent = (
      <ViewTenantModal tenant={tenantToView} onClose={() => setTenantToView(null)} />
    );

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById("modal-root") || document.body
    );
  };

const renderDeleteModal = () => {
  return null;

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setTenantToDelete(null)}
      />

      {/* Card */}
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
            onClick={() => setTenantToDelete(null)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-slate-500" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-700">
            ¿Estás seguro de que deseas eliminar a{" "}
            <span className="font-semibold text-slate-900">
              {tenantToDelete.primerNombre} {tenantToDelete.primerApellido}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTenantToDelete(null)}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDeleteTenant}
            className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
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
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Arrendatarios</h1>
            <p className="text-slate-600 mt-1">Administra la información de tus arrendatarios, contratos y propiedades vinculadas</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setTenantToEdit(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Nuevo Arrendatario
          </motion.button>
        </motion.div>

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
                placeholder="Buscar arrendatario por nombre, documento, correo..."
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

        {/* Banner removido: se usarán toasts para feedback */}

        {/* CONTENT AREA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* TABLA REORGANIZADA */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-visible">
            {/* CABECERA DE TABLA */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Información Personal</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Documento</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Inmueble Asignado</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          Cargando arrendatarios...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm text-slate-500">No se encontraron arrendatarios con el criterio seleccionado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => {
                      const estadoNormalized = normalizeEstado(tenant.estado);
                      const estadoLabel = tenant.estado || "Pendiente";
                      return (
                      <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                        {/* INFORMACIÓN PERSONAL */}
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <p className="font-semibold text-slate-800 text-sm">
                              {tenant.primerNombre} {tenant.primerApellido}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {tenant.correo}
                            </p>
                          </div>
                        </td>

                        {/* DOCUMENTO */}
                        <td className="px-6 py-4 text-center">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500 block">Tipo</span>
                            <span className="text-sm font-medium text-slate-700 block">{tenant.tipoDocumento}</span>
                            <span className="text-xs text-slate-500 block">Número</span>
                            <span className="text-sm font-semibold text-slate-800 block">{tenant.documento}</span>
                          </div>
                        </td>

                        {/* INMUEBLE ASIGNADO */}
                        <td className="px-6 py-4">
                          {tenant.inmueblesArrendados && tenant.inmueblesArrendados.length > 0 ? (
                          <div className="text-center">
                            <p className="font-semibold text-slate-800 text-sm">
                              {tenant.inmueblesArrendados[0].nombre || "Inmueble #" + tenant.inmueblesArrendados[0].id}
                            </p>
                            <p className="text-xs text-slate-500">
                              {tenant.inmueblesArrendados[0].direccion || "Dirección no especificada"}
                            </p>
                          </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Home className="w-6 h-6 mb-1" />
                              <span className="text-xs italic">Sin inmuebles asignados</span>
                            </div>
                          )}
                        </td>

                        {/* CONTACTO */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3 h-3" />
                              <span className="text-sm font-medium">{tenant.telefono}</span>
                            </div>
                            {tenant.celular && (
                              <div className="text-xs text-slate-500">
                                Cel: {tenant.celular}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* ESTADO */}
                        <td className="px-6 py-4 text-center relative">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <button
                              type="button"
                              onClick={() =>
                                setStatusMenuId((prev) =>
                                  prev === (tenant.id || tenant.id_arrendatario || tenant.personaId)
                                    ? null
                                    : (tenant.id || tenant.id_arrendatario || tenant.personaId)
                                )
                              }
                              disabled={statusChangingId === (tenant.id || tenant.id_arrendatario || tenant.personaId)}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
                                estadoNormalized === "activo"
                                  ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:ring-2 hover:ring-green-200"
                                  : estadoNormalized === "moroso"
                                  ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:ring-2 hover:ring-red-200"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 hover:ring-2 hover:ring-yellow-200"
                              } ${statusChangingId === (tenant.id || tenant.id_arrendatario || tenant.personaId) ? "opacity-60 cursor-not-allowed" : ""} ${statusMenuId === (tenant.id || tenant.id_arrendatario || tenant.personaId) ? "ring-2 ring-slate-200" : ""}`}
                            >
                              {statusChangingId === (tenant.id || tenant.id_arrendatario || tenant.personaId) && (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              )}
                              <span>{estadoLabel}</span>
                              <ChevronDown className="w-3 h-3 ml-2" />
                            </button>
                            {statusMenuId === (tenant.id || tenant.id_arrendatario || tenant.personaId) && (
                              <div className="absolute left-1/2 -translate-x-1/2 top-12 z-50 bg-white border border-slate-200 rounded-lg shadow-xl text-xs w-36 py-1">
                                {["Activo", "Inactivo"].map((estadoOpcion) => (
                                  <button
                                    key={estadoOpcion}
                                    type="button"
                                    onClick={() => handleToggleEstado(tenant, estadoOpcion)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                  >
                                    {estadoOpcion}
                                  </button>
                                ))}
                              </div>
                            )}
                            {tenant.fechaInicio && (
                              <span className="text-xs text-slate-500">
                                Desde: {new Date(tenant.fechaInicio).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACCIONES */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleViewTenant(tenant)}
                              className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                              aria-label="Ver arrendatario"
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                setTenantToEdit(tenant);
                                setShowForm(true);
                              }}
                              className="p-2 text-green-600 hover:text-green-800 transition-colors"
                              aria-label="Editar arrendatario"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            {/* Acción de eliminar temporalmente deshabilitada */}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODALES */}
      {renderFormModal()}
      {renderViewModal()}
      {renderDeleteModal()}
    </>
  );
}
