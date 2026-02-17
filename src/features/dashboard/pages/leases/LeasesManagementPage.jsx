import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { motion } from 'framer-motion';
import { FaUserPlus, FaEye, FaEdit, FaSearch, FaTrash, FaHome, FaPhone, FaEnvelope } from "react-icons/fa";
import { Plus, Search, Filter, Eye, Edit, Trash2, Users, Home, Phone, Mail } from 'lucide-react';
import "../../../../shared/styles/globals.css";
import LeasesPersonForm from "../../components/leases/TenantForm";
import ViewTenantModal from "../../components/leases/ViewTenantForm";
import { renantsApiService } from "../../../../shared/services/arrendatarioApiService";

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

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const tenants = await renantsApiService.getAll();
      setArrendatarios(tenants);
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
      setStatusMessage({ type: "success", message: "Arrendatario creado correctamente" });
      handleCloseForm();
    } catch (error) {
      setStatusMessage({ type: "error", message: error.message || "No fue posible crear el arrendatario" });
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
      setStatusMessage({ type: "success", message: "Arrendatario actualizado correctamente" });
      handleCloseForm();
    } catch (error) {
      setStatusMessage({ type: "error", message: error.message || "No fue posible actualizar el arrendatario" });
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
      setStatusMessage({ type: "success", message: "Arrendatario eliminado correctamente" });
    } catch (error) {
      setStatusMessage({ type: "error", message: error.message || "No fue posible eliminar al arrendatario" });
    } finally {
      setTenantToDelete(null);
    }
  };

  // Calcular estadísticas
  const stats = {
    total: filteredTenants.length,
    activos: filteredTenants.filter(t => t.estado === 'Activo').length,
    morosos: filteredTenants.filter(t => t.estado === 'Moroso').length,
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
    if (!tenantToDelete) return null;

    const modalContent = (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm transition-opacity duration-300">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-100 opacity-100">
          <h3 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Eliminar Arrendatario
          </h3>
          <p className="mb-6 text-gray-700">
            ¿Confirma que desea eliminar a{" "}
            <span className="font-extrabold text-purple-700">
              {tenantToDelete.primerNombre} {tenantToDelete.primerApellido}
            </span>
            ? Esta acción es irreversible.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTenantToDelete(null)}
              className="bg-gray-300 text-gray-800 px-5 py-2 rounded-xl font-semibold hover:bg-gray-400 transition duration-150"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeleteTenant}
              className="bg-red-600 text-white px-5 py-2 rounded-xl font-semibold transition duration-150 shadow-md flex items-center gap-2 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </motion.button>
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

        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              statusMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {statusMessage.message}
          </motion.div>
        )}

        {/* CONTENT AREA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* TABLA REORGANIZADA */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
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
                          <Users className="w-8 h-8 text-slate-400" />
                          <p>No se encontraron arrendatarios con el criterio seleccionado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                        {/* INFORMACIÓN PERSONAL */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 rounded-full p-2">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-slate-800 text-sm">
                                {tenant.primerNombre} {tenant.primerApellido}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
                                <Mail className="w-3 h-3" />
                                {tenant.correo}
                              </p>
                            </div>
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
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 rounded-full p-2">
                                <Home className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="text-center">
                                <p className="font-semibold text-slate-800 text-sm">
                                  {tenant.inmueblesArrendados[0].nombre || "Inmueble #" + tenant.inmueblesArrendados[0].id}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {tenant.inmueblesArrendados[0].direccion || "Dirección no especificada"}
                                </p>
                              </div>
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
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                                tenant.estado === "Activo"
                                  ? "bg-green-100 text-green-700 border-green-200"
                                  : tenant.estado === "Moroso"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200"
                              }`}
                            >
                              {tenant.estado || "Pendiente"}
                            </span>
                            {tenant.fechaInicio && (
                              <span className="text-xs text-slate-500">
                                Desde: {new Date(tenant.fechaInicio).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACCIONES */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2 items-center">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setTenantToView(tenant)}
                              className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm p-2 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setTenantToEdit(tenant);
                                setShowForm(true);
                              }}
                              className="w-full flex items-center justify-center gap-2 text-green-600 hover:text-green-800 font-medium text-sm p-2 rounded-lg hover:bg-green-50 transition-colors border border-green-200"
                            >
                              <Edit className="w-4 h-4" />
                              Editar
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setTenantToDelete(tenant)}
                              className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-800 font-medium text-sm p-2 rounded-lg hover:bg-red-50 transition-colors border border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    ))
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
