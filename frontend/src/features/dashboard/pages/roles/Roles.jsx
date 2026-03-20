import React, { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { Eye, Edit, Trash2, Plus, Shield, ShieldCheck, Loader2, XCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import CrearRolModal from "./CrearRolModal";
import EditarRolModal from "./EditarRolModal";
import VerRolModal from "./VerRolModal";
import AdminHolderCard from "./AdminHolderCard";
import DeleteConfirmModal from "../../../../shared/components/modals/DeleteConfirmModal";
import ConfirmationDialog from "../../../../shared/components/ui/ConfirmationDialog";
import rolesApiService from "../../../../shared/services/rolesApiService";
import { useAuth } from "../../../../shared/contexts/AuthContext";
import { useToast } from "../../../../shared/hooks/use-toast";
import EmptyState from "../../../../shared/components/ui/EmptyState";
import "./Switch.css";

const RolesContent = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isSuperAdmin = userRoles.includes('Super Administrador');
  const isAdmin = userRoles.includes('Administrador');
  const canManageRoles = isSuperAdmin;

  // Roles del sistema que no se pueden eliminar (todos los predefinidos)
  const rolesNoEliminar = ['Super Administrador', 'Administrador', 'Empleado', 'Usuario', 'Propietario'];

  // Roles protegidos que no se pueden editar ni cambiar estado (solo Super Admin y Admin)
  const rolesProtegidos = ['Super Administrador', 'Administrador'];

  const isProtectedRol = (rol) => rolesProtegidos.includes(rol.nombre);
  const cannotDeleteRol = (rol) => !canManageRoles || rolesNoEliminar.includes(rol.nombre);
  const cannotEditRol = (rol) => !canManageRoles || isProtectedRol(rol);
  const cannotChangeStatusRol = (rol) => !canManageRoles || isProtectedRol(rol);

  const [roles, setRoles] = useState([]);
  const [rolesFiltrados, setRolesFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Estado para el filtro
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'activo', 'inactivo'
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [verModalOpen, setVerModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [isDeletingRol, setIsDeletingRol] = useState(false);
  const [isChangingRolStatus, setIsChangingRolStatus] = useState(false);
  
  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;



  const cargarRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando roles para usuario administrativo:', user?.email);
      const rolesData = await rolesApiService.obtenerRoles();
      // Orden especial: Super Administrador (ID 1) y Administrador (ID 2) primero, luego el resto por ID
      const rolesSorted = (rolesData || []).sort((a, b) => {
        // Super Administrador siempre primero
        if (a.id == 1) return -1;
        if (b.id == 1) return 1;

        // Administrador siempre segundo
        if (a.id == 2) return -1;
        if (b.id == 2) return 1;

        // Resto ordenados por ID
        return parseInt(a.id, 10) - parseInt(b.id, 10);
      });
      setRoles(rolesSorted);
    } catch (err) {
      console.error('Error al cargar roles:', err);
      setError(err.message || 'Error al cargar los roles desde el servidor.');
      toast({
        title: "Error al cargar roles",
        description: err.message || "No se pudieron obtener los roles desde el servidor.",
        variant: "destructive",
      });
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };



  // Efecto para filtrar roles
  useEffect(() => {
    if (roles.length === 0) {
      setRolesFiltrados([]);
      return;
    }

    let filtrados = roles;

    if (filtroEstado === 'activo') {
      filtrados = roles.filter((rol) => rol.estado);
    } else if (filtroEstado === 'inactivo') {
      filtrados = roles.filter((rol) => !rol.estado);
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch) {
      filtrados = filtrados.filter((rol) =>
        String(rol?.nombre || '').toLowerCase().includes(normalizedSearch) ||
        String(rol?.id || '').toLowerCase().includes(normalizedSearch)
      );
    }

    setRolesFiltrados(filtrados);
    setCurrentPage(1);
  }, [roles, filtroEstado, searchTerm]);

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRoles = rolesFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rolesFiltrados.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    const userCanViewRoles = isAuthenticated && (isSuperAdmin || isAdmin);
    setIsAuthorized(userCanViewRoles);

    if (userCanViewRoles) {
      cargarRoles();
    } else {
      console.log('Acceso denegado: el usuario no es administrativo.');
      setLoading(false);
      setRoles([]);
    }
  }, [isAuthenticated, authLoading, isSuperAdmin, isAdmin]);



  const handleCrearRol = async (nuevoRol) => {
    if (!canManageRoles) {
      toast({
        title: "Operacion no permitida",
        description: "Administrador tiene acceso de solo lectura en el modulo de roles.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creando nuevo rol:', nuevoRol);
      const rolCreado = await rolesApiService.crearRol(nuevoRol);
      await cargarRoles();
      toast({
        title: "Rol creado exitosamente",
        description: `El rol "${rolCreado.nombre_rol}" ha sido creado correctamente.`,
      });
      setModalOpen(false);
    } catch (error) {
      console.error('Error al crear rol:', error);
      toast({
        title: "Error al crear rol",
        description: error.message || "No se pudo crear el rol.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleActualizarRol = async (rolEditado) => {
    if (!canManageRoles) {
      toast({
        title: "Operacion no permitida",
        description: "Administrador tiene acceso de solo lectura en el modulo de roles.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Actualizando rol:', { id: rolEditado.id, nombre_rol: rolEditado.nombre_rol });

      const datosActualizados = {
        nombre_rol: rolEditado.nombre_rol,
        estado: rolEditado.estado,
        permisos: rolEditado.permisos
      };

      await rolesApiService.actualizarRol(rolEditado.id, datosActualizados);
      await cargarRoles();
      toast({
        title: "Rol actualizado",
        description: "El rol ha sido actualizado correctamente.",
      });
      setEditarModalOpen(false);
      setRolSeleccionado(null);
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar el rol.",
        variant: "destructive",
      });
      throw error;
    }
  };


  const handleToggleEstadoRequest = (rol) => {
    if (!canManageRoles) {
      toast({
        title: "Operacion no permitida",
        description: "Administrador tiene acceso de solo lectura en el modulo de roles.",
        variant: "destructive",
      });
      return;
    }

    if (cannotChangeStatusRol(rol)) {
      toast({
        title: "Accion no permitida",
        description: "No se puede cambiar el estado de un rol protegido.",
        variant: "destructive",
      });
      return;
    }
    setRolSeleccionado(rol);
    setIsStatusChangeDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (isChangingRolStatus || !rolSeleccionado) return;
    if (!canManageRoles) {
      toast({
        title: "Operacion no permitida",
        description: "Administrador tiene acceso de solo lectura en el modulo de roles.",
        variant: "destructive",
      });
      return;
    }

    const rolActual = rolSeleccionado;
    const nuevoEstado = !rolActual.estado;

    setIsChangingRolStatus(true);
    try {
      await rolesApiService.actualizarRol(rolActual.id, { estado: nuevoEstado });
      await cargarRoles();
      toast({
        title: "Estado actualizado",
        description: `El rol "${rolActual.nombre}" ha sido ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`,
      });
    } catch (error) {
      console.error('Error al cambiar estado del rol:', error);
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo cambiar el estado del rol.",
        variant: "destructive",
      });
    } finally {
      setIsChangingRolStatus(false);
      setIsStatusChangeDialogOpen(false);
      setRolSeleccionado(null);
    }
  };

  const handleEditar = (rol) => {
    if (cannotEditRol(rol)) {
      toast({
        title: "Operacion no permitida",
        description: !canManageRoles
          ? "Administrador tiene acceso de solo lectura en el modulo de roles."
          : "No se puede editar un rol protegido.",
        variant: "destructive",
      });
      return;
    }

    setRolSeleccionado(rol);
    setEditarModalOpen(true);
  };

  const handleVer = (rol) => {
    setRolSeleccionado(rol);
    setVerModalOpen(true);
  };

  const handleDeleteClick = (rol) => {
    if (cannotDeleteRol(rol)) {
      toast({
        title: "Operacion no permitida",
        description: !canManageRoles
          ? "Administrador tiene acceso de solo lectura en el modulo de roles."
          : "No se puede eliminar un rol protegido.",
        variant: "destructive",
      });
      return;
    }
    setRolSeleccionado(rol);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmEliminar = async () => {
    if (isDeletingRol || !rolSeleccionado) return;
    if (!canManageRoles) {
      toast({
        title: "Operacion no permitida",
        description: "Administrador tiene acceso de solo lectura en el modulo de roles.",
        variant: "destructive",
      });
      return;
    }
    setIsDeletingRol(true);
    try {
      await rolesApiService.eliminarRol(rolSeleccionado.id);
      setRoles((prev) => prev.filter((rol) => rol.id !== rolSeleccionado.id));
      toast({
        title: "Rol eliminado",
        description: `El rol "${rolSeleccionado.nombre}" ha sido eliminado correctamente.`,
      });
    } catch (error) {
      console.error('Error al eliminar el rol:', error);
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el rol.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingRol(false);
      setIsDeleteModalOpen(false);
      setRolSeleccionado(null);
    }
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingRol) return;
    setIsDeleteModalOpen(false);
    setRolSeleccionado(null);
  };

  const handleCloseStatusDialog = () => {
    if (isChangingRolStatus) return;
    setIsStatusChangeDialogOpen(false);
    setRolSeleccionado(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="px-6 py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-slate-600">Cargando roles...</p>
        </div>
      );
    }

    if (!isAuthorized) {
      return (
        <div className="px-6 py-8 text-center">
          <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-600 font-medium mb-2">Acceso no autorizado</p>
          <p className="text-slate-500">No tienes los permisos necesarios para ver esta seccion.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="px-6 py-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium mb-2">Error al cargar roles</p>
          <p className="text-slate-600">{error}</p>
        </div>
      );
    }

    if (roles.length === 0) {
      return <EmptyState message="No se encontraron roles en el sistema." />;
    }

    if (rolesFiltrados.length === 0) {
      return <EmptyState message="No hay roles que coincidan con los filtros aplicados." />;
    }

    return (
      <>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentRoles.map((rol) => (
                  <motion.tr key={rol.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`hover:bg-slate-50 transition-colors ${isProtectedRol(rol) ? "bg-blue-50 hover:bg-blue-100" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-slate-900">{rol.id}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isProtectedRol(rol) ? (
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-slate-900">{rol.nombre}</span>
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Protegido</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-900">{rol.nombre}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${rol.estado ? "text-green-600" : "text-red-600"}`}>
                          {rol.estado ? "Activo" : "Inactivo"}
                        </span>
                        <label className="switch-container relative">
                          <input type="checkbox" checked={!!rol.estado} disabled={cannotChangeStatusRol(rol)} readOnly />
                          <span className="switch-slider"></span>
                          {!cannotChangeStatusRol(rol) && (
                            <div
                              className="absolute inset-0 cursor-pointer"
                              onClick={() => handleToggleEstadoRequest(rol)}
                            ></div>
                          )}
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleVer(rol)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalles del rol"><Eye className="w-4 h-4" /></motion.button>
                        <motion.button
                          whileHover={{ scale: cannotEditRol(rol) ? 1 : 1.05 }}
                          whileTap={{ scale: cannotEditRol(rol) ? 1 : 0.95 }}
                          onClick={() => handleEditar(rol)}
                          disabled={cannotEditRol(rol)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Editar rol">
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: cannotDeleteRol(rol) ? 1 : 1.05 }}
                          whileTap={{ scale: cannotDeleteRol(rol) ? 1 : 0.95 }}
                          onClick={() => handleDeleteClick(rol)}
                          disabled={cannotDeleteRol(rol)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar rol">
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-6">
          {currentRoles.map((rol) => (
            <motion.div key={rol.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-white rounded-lg border border-slate-200 p-4 mb-4 ${isProtectedRol(rol) ? "bg-blue-50 border-blue-200" : ""}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  {isProtectedRol(rol) ? (
                    <div className="flex items-center mb-1">
                      <Shield className="w-4 h-4 text-blue-600 mr-2" />
                      <h3 className="font-medium text-slate-800">{rol.nombre}</h3>
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Protegido</span>
                    </div>
                  ) : (
                    <h3 className="font-medium text-slate-800">{rol.nombre}</h3>
                  )}
                  <p className="text-sm text-slate-600">ID: {rol.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${rol.estado ? "text-green-600" : "text-red-600"}`}>
                    {rol.estado ? "Activo" : "Inactivo"}
                  </span>
                  <label className="switch-container relative">
                    <input type="checkbox" checked={!!rol.estado} disabled={cannotChangeStatusRol(rol)} readOnly />
                    <span className="switch-slider"></span>
                    {!cannotChangeStatusRol(rol) && (
                      <div
                        className="absolute inset-0 cursor-pointer"
                        onClick={() => handleToggleEstadoRequest(rol)}
                      ></div>
                    )}
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button onClick={() => handleVer(rol)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Eye className="w-4 h-4" />Ver</motion.button>
                <motion.button
                  onClick={() => handleEditar(rol)}
                  disabled={cannotEditRol(rol)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Edit className="w-4 h-4" />Editar
                </motion.button>
                <motion.button
                  onClick={() => handleDeleteClick(rol)}
                  disabled={cannotDeleteRol(rol)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />Eliminar
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Paginador */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, rolesFiltrados.length)}</span> de{' '}
                  <span className="font-medium">{rolesFiltrados.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </>

    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-6 rounded-t-2xl">
        <div className="flex items-center">
          <div className="py-1"><ShieldCheck className="h-6 w-6 text-blue-500 mr-4" /></div>
          <div>
            <p className="font-bold">{canManageRoles ? "Vista de Super Administrador" : "Vista de Administrador (solo lectura)"}</p>
            <p className="text-sm">
              {canManageRoles
                ? "Este es el rol principal del sistema con todos los permisos. Puedes crear nuevos roles segun sea necesario."
                : "Puedes consultar roles y permisos, pero no crear, editar, eliminar ni cambiar estados en este modulo."}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Roles</h2>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o ID del rol"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
            {canManageRoles && <AdminHolderCard className="w-full md:w-auto" />}
            {canManageRoles && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nuevo rol
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm font-medium text-slate-600">Filtrar por estado:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${filtroEstado === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroEstado('activo')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${filtroEstado === 'activo'
                ? 'bg-green-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFiltroEstado('inactivo')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${filtroEstado === 'inactivo'
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
            >
              Inactivos
            </button>
          </div>
        </div>
      </div>

      {renderContent()}

      <CrearRolModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCrearRol}
      />

      <EditarRolModal
        isOpen={editarModalOpen}
        onClose={() => {
          setEditarModalOpen(false);
          setRolSeleccionado(null);
        }}
        rol={rolSeleccionado}
        onSave={handleActualizarRol}
      />

      <VerRolModal
        isOpen={verModalOpen}
        onClose={() => {
          setVerModalOpen(false);
          setRolSeleccionado(null);
        }}
        rol={rolSeleccionado}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmEliminar}
        isLoading={isDeletingRol}
        itemName={rolSeleccionado?.nombre || "este rol"}
      />

      <ConfirmationDialog
        isOpen={isStatusChangeDialogOpen}
        onClose={handleCloseStatusDialog}
        onConfirm={handleConfirmStatusChange}
        isLoading={isChangingRolStatus}
        title={`${rolSeleccionado?.estado ? 'Desactivar' : 'Activar'} rol`}
        message={`Estas seguro de que deseas ${rolSeleccionado?.estado ? 'desactivar' : 'activar'} el rol "${rolSeleccionado?.nombre}"?`}
      />
    </div>
  );
}

export default function Roles() {
  return (
    <RolesContent />
  );
}

