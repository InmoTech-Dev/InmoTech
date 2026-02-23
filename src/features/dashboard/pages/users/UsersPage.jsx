import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, UserCheck, UserX, AlertTriangle, ShieldCheck } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import StatsCard from '../../components/StatsCard';
import CreateUserModal from '../../components/users/CreateUserModal';
import ViewUserModal from '../../components/users/ViewUserModal';
import EditUserModal from '../../components/users/EditUserModal';
import UserTable from '../../components/users/UserTable';
import DeleteConfirmModal from '../../../../shared/components/modals/DeleteConfirmModal';
import StatusChangeConfirmModal from '../../../../shared/components/modals/StatusChangeConfirmModal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../shared/components/ui/select';
import { useToast } from '../../../../shared/hooks/use-toast';
import { useUsers } from '../../../../shared/contexts/UsersContext';
import { useAuth } from '../../../../shared/contexts/AuthContext';

const UsersPage = () => {
  const {
    users,
    loading,
    createUser,
    updateUserComplete,
    removeUser,
    changeUserStatus,
    resendInvitation
  } = useUsers();
  const { user, hasRole } = useAuth();

  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [accessFilter, setAccessFilter] = useState('Todos');
  const [dateFilter, setDateFilter] = useState('Todos los periodos');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [loadingStatusChanges, setLoadingStatusChanges] = useState(new Set());
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isChangingUserStatus, setIsChangingUserStatus] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const { toast } = useToast();
  const [loadingResend, setLoadingResend] = useState(new Set());

  // Funciones auxiliares para filtrado por fecha
  const getDateRange = (filter) => {
    const now = new Date();
    const start = new Date();

    switch (filter) {
      case 'Hoy':
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
      case 'Esta semana':
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
      case 'Este mes':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
      default:
        return { start: null, end: null };
    }
  };

  // Estado de acceso combinado
  const getAccessState = (user) => {
    const isDisabled = user?.estado === false;
    const hasAccount = user?.tiene_cuenta === true || user?.tiene_cuenta === 1;

    if (isDisabled) return 'Cuenta deshabilitada';
    if (hasAccount) return 'Cuenta activa';
    return 'Pendiente de activacion';
  };

  // Filtrar usuarios
  useEffect(() => {
    let filtered = Array.isArray(users) ? users : [];

    // Filtro de búsqueda de texto
    if (searchTerm) {
      filtered = filtered.filter(user => {
        const fullName = `${user.nombre_completo || ''} ${user.apellido_completo || ''}`.toLowerCase().trim();
        const email = (user.correo || '').toLowerCase();
        const numeroDocumento = (user.numero_documento || '').toLowerCase();

        return fullName.includes(searchTerm.toLowerCase()) ||
          email.includes(searchTerm.toLowerCase()) ||
          numeroDocumento.includes(searchTerm.toLowerCase());
      });
    }

    // Filtro por estado
    if (statusFilter !== 'Todos') {
      const isHabilitado = statusFilter === 'Habilitado';
      filtered = filtered.filter(user => user.estado !== undefined && user.estado === isHabilitado);
    }

    if (accessFilter !== 'Todos') {
      filtered = filtered.filter(user => getAccessState(user) === accessFilter);
    }

    // Filtro por fecha de creación
    if (dateFilter !== 'Todos los periodos') {
      if (dateFilter === 'Personalizado' && customDateRange.startDate && customDateRange.endDate) {
        const startDate = new Date(customDateRange.startDate);
        const endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // Fin del día

        filtered = filtered.filter(user => {
          const userCreationDate = new Date(user.fecha_registro);
          return userCreationDate >= startDate && userCreationDate <= endDate;
        });
      } else {
        const range = getDateRange(dateFilter);
        if (range.start && range.end) {
          const startDate = new Date(range.start);
          const endDate = new Date(range.end);
          endDate.setHours(23, 59, 59, 999);

          filtered = filtered.filter(user => {
            const userCreationDate = new Date(user.fecha_registro);
            return userCreationDate >= startDate && userCreationDate <= endDate;
          });
        }
      }
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, accessFilter, dateFilter, customDateRange, users]);

  // Calcular estadísticas
  const usersArray = Array.isArray(users) ? users : [];
  const stats = {
    total: usersArray.length,
    habilitados: usersArray.filter(u => u.estado === true).length,
    deshabilitados: usersArray.filter(u => u.estado === false).length,
  };
  const accessStats = {
    activa: usersArray.filter(u => getAccessState(u) === 'Cuenta activa').length,
    verificacion: usersArray.filter(u => getAccessState(u) === 'Pendiente de activacion').length,
    deshabilitada: usersArray.filter(u => getAccessState(u) === 'Cuenta deshabilitada').length,
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleCreateUser = async (newUser) => {
    try {
      setServerErrors({}); // Limpiar errores previos
      await createUser(newUser);
      setIsCreateModalOpen(false);
      toast({
        title: "¡Usuario creado exitosamente!",
        description: "El usuario ha sido registrado correctamente.",
        variant: "default"
      });
    } catch (error) {
      // Capturar errores específicos del servidor
      if (error.response?.data?.message) {
        const message = error.response.data.message;
        if (message.includes('correo') || message.includes('email')) {
          setServerErrors({ correo: message });
        } else if (message.includes('documento')) {
          setServerErrors({ numero_documento: message });
        } else {
          setServerErrors({ general: message });
        }
      }
      // Error ya manejado en el contexto con toast
    }
  };

  const handleEditUser = async (updatedUser) => {
    try {
      await updateUserComplete(selectedUser.id_persona, updatedUser);
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      // Error ya manejado en el contexto
    }
  };

  const handleDeleteUser = async () => {
    if (isDeletingUser || !selectedUser) {
      return;
    }

    setIsDeletingUser(true);
    try {
      await removeUser(selectedUser.id_persona);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      // Error ya manejado en el contexto
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingUser) return;
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleStatusChangeRequest = (user, newStatus) => {
    setSelectedUser(user);
    setPendingStatusChange({ userId: user.id_persona, newStatus: newStatus }); // newStatus ya viene como boolean del UserStatusSelector
    setLoadingStatusChanges(prev => new Set(prev).add(user.id_persona));
    setIsStatusChangeModalOpen(true);
  };

  const handleCloseStatusChangeModal = () => {
    if (isChangingUserStatus) return;
    setLoadingStatusChanges(prev => {
      const newSet = new Set(prev);
      if (pendingStatusChange?.userId) {
        newSet.delete(pendingStatusChange.userId);
      }
      return newSet;
    });
    setIsStatusChangeModalOpen(false);
    setSelectedUser(null);
    setPendingStatusChange(null);
  };

  const handleStatusChangeConfirm = async () => {
    if (isChangingUserStatus || !pendingStatusChange) {
      return;
    }

    setIsChangingUserStatus(true);
    try {
      const nuevoEstado = pendingStatusChange.newStatus; // boolean
      await changeUserStatus(selectedUser.id_persona, nuevoEstado);

      setLoadingStatusChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingStatusChange.userId);
        return newSet;
      });

      setIsStatusChangeModalOpen(false);
      setSelectedUser(null);
      setPendingStatusChange(null);

      const fullName = `${selectedUser.nombre_completo || ''} ${selectedUser.apellido_completo || ''}`.trim();
      const estadoText = nuevoEstado ? 'habilitado' : 'deshabilitado';
      toast({
        title: "¡Estado actualizado exitosamente!",
        description: `El usuario ${fullName} ha sido ${estadoText}.`,
        variant: "default"
      });
    } catch (error) {
      setLoadingStatusChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingStatusChange.userId);
        return newSet;
      });

      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario",
        variant: "destructive"
      });
    } finally {
      setIsChangingUserStatus(false);
    }
  };

  const handleResendInvitation = async (user) => {
    if (!user) return;
    setLoadingResend(prev => {
      const next = new Set(prev);
      next.add(user.id_persona);
      return next;
    });
    try {
      await resendInvitation(user);
    } finally {
      setLoadingResend(prev => {
        const next = new Set(prev);
        next.delete(user.id_persona);
        return next;
      });
    }
  };

  // Verificación de permisos - Solo Super Administrador y Administrador pueden acceder
  const hasAccessToUsers = hasRole(['Super Administrador', 'Administrador']);

  if (!hasAccessToUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 max-w-md"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 4v-4m0 0V5m0 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600">
            Solo los Super Administradores y Administradores tienen permiso para acceder al módulo de usuarios.
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Su rol actual: <span className="font-medium">{user?.roles?.join(', ') || 'Sin rol'}</span>
          </p>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden flex flex-col min-h-0 h-[calc(100dvh-12rem)] md:h-[calc(100dvh-13rem)] max-h-[calc(100dvh-12rem)] md:max-h-[calc(100dvh-13rem)] gap-3">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">Gestión de Usuarios</h1>
          <p className="text-slate-600 text-sm mt-0.5">Administra todos los usuarios registrados</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setServerErrors({}); // Limpiar errores al abrir el modal
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 text-sm md:text-base"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Nuevo Usuario
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2"
      >
        <StatsCard
          title="Total Usuarios"
          value={stats.total}
          icon={UserCheck}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          textColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatsCard
          title="Habilitados"
          value={stats.habilitados}
          icon={UserCheck}
          color="bg-gradient-to-r from-green-500 to-green-600"
          textColor="text-green-600"
          bgColor="bg-green-50"
        />
        <StatsCard
          title="Deshabilitados"
          value={stats.deshabilitados}
          icon={UserX}
          color="bg-gradient-to-r from-red-500 to-red-600"
          textColor="text-red-600"
          bgColor="bg-red-50"
        />
        <StatsCard
          title="Cuenta activa"
          value={accessStats.activa}
          icon={ShieldCheck}
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          textColor="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatsCard
          title="Pendiente activacion"
          value={accessStats.verificacion}
          icon={AlertTriangle}
          color="bg-gradient-to-r from-amber-500 to-amber-600"
          textColor="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatsCard
          title="Cuenta deshabilitada"
          value={accessStats.deshabilitada}
          icon={UserX}
          color="bg-gradient-to-r from-slate-500 to-slate-600"
          textColor="text-slate-600"
          bgColor="bg-slate-50"
        />
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="flex-1 min-w-[260px]">
          <SearchBar
            placeholder="Buscar por nombre, email, documento..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="w-full sm:w-auto"
        >
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="h-10 w-full sm:w-[136px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Habilitado">Habilitados</SelectItem>
              <SelectItem value="Deshabilitado">Deshabilitados</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="w-full sm:w-auto"
        >
          <Select
            value={accessFilter}
            onValueChange={setAccessFilter}
          >
            <SelectTrigger className="h-10 w-full sm:w-[180px]">
              <SelectValue placeholder="Estado de acceso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Cuenta activa">Cuenta activa</SelectItem>
              <SelectItem value="Pendiente de activacion">Pendiente de activacion</SelectItem>
              <SelectItem value="Cuenta deshabilitada">Cuenta deshabilitada</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="w-full sm:w-auto"
        >
          <Select
            value={dateFilter}
            onValueChange={setDateFilter}
          >
            <SelectTrigger className="h-10 w-full sm:w-[170px]">
              <SelectValue placeholder="Fecha de registro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos los periodos">Todos los periodos</SelectItem>
              <SelectItem value="Hoy">Hoy</SelectItem>
              <SelectItem value="Esta semana">Esta semana</SelectItem>
              <SelectItem value="Este mes">Este mes</SelectItem>
              <SelectItem value="Personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {dateFilter === 'Personalizado' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap gap-2 items-center w-full lg:w-auto"
          >
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium text-slate-700">Desde:</label>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="h-10 w-full sm:w-auto px-2.5 rounded-md border border-slate-300 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium text-slate-700">Hasta:</label>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="h-10 w-full sm:w-auto px-2.5 rounded-md border border-slate-300 text-sm"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex-1 min-h-0 overflow-hidden"
      >
        <UserTable
          users={currentItems}
          onView={handleViewUser}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onStatusChange={handleStatusChangeRequest}
          loadingStatusChanges={loadingStatusChanges}
          loadingResend={loadingResend}
          onResendInvitation={handleResendInvitation}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </motion.div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        serverErrors={serverErrors}
      />

      <ViewUserModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        user={selectedUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
        onSubmit={handleEditUser}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteUser}
        isLoading={isDeletingUser}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario ${selectedUser?.nombre_completo || ''} ${selectedUser?.apellido_completo || ''}? Esta acción no se puede deshacer.`}
      />

      <StatusChangeConfirmModal
        isOpen={isStatusChangeModalOpen}
        onClose={handleCloseStatusChangeModal}
        onConfirm={handleStatusChangeConfirm}
        isLoading={isChangingUserStatus}
        title="Confirmar Cambio de Estado"
        message="¿Estás seguro de que deseas cambiar el estado de este usuario?"
        currentStatus={selectedUser?.estado ? 'Habilitado' : 'Deshabilitado'}
        newStatus={pendingStatusChange?.newStatus ? 'Habilitado' : 'Deshabilitado'}
        userInfo={
          selectedUser
            ? {
              nombre: `${selectedUser.nombre_completo || ''} ${selectedUser.apellido_completo || ''}`.trim(),
              documento: `${selectedUser.tipo_documento} ${selectedUser.numero_documento}`,
              email: selectedUser.correo
            }
            : null
        }
      />
    </div>
  );
};

export default UsersPage;



