import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Eye, Edit, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import StatsCard from '../../components/StatsCard';
import AdministrativosTable from '../../components/administrativos/AdministrativosTable';
import CreateAdministrativoModal from '../../components/administrativos/CreateAdministrativoModal';
import ViewAdministrativoModal from '../../components/administrativos/ViewAdministrativoModal';
import EditAdministrativoModal from '../../components/administrativos/EditAdministrativoModal';
import DeleteConfirmModal from '../../../../shared/components/modals/DeleteConfirmModal';
import StatusChangeConfirmModal from '../../../../shared/components/modals/StatusChangeConfirmModal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../shared/components/ui/select';
import { useToast } from '../../../../shared/hooks/use-toast';
import { useAdministrativos } from '../../../../shared/contexts/AdministrativosContext';

const AdministrativosPage = () => {
  const {
    administrativos,
    loading,
    createAdministrativo,
    updateAdministrativoComplete,
    removeAdministrativo,
    changeEstadoAdministrativo
  } = useAdministrativos();

  const [filteredAdministrativos, setFilteredAdministrativos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [roleFilter, setRoleFilter] = useState('Todos los roles');
  const [dateFilter, setDateFilter] = useState('Todos los periodos');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
  const [selectedAdministrativo, setSelectedAdministrativo] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [loadingStatusChanges, setLoadingStatusChanges] = useState(new Set());
  const [isDeletingAdministrativo, setIsDeletingAdministrativo] = useState(false);
  const [isChangingAdministrativoStatus, setIsChangingAdministrativoStatus] = useState(false);
  const { toast } = useToast();

  // Cargar roles disponibles al montar el componente
  useEffect(() => {
    const cargarRolesDisponibles = async () => {
      try {
        const rolesApiService = (await import('../../../../shared/services/rolesApiService')).default;
        const roles = await rolesApiService.obtenerRoles();

        // Filtrar solo roles administrativos activos
        const rolesAdministrativos = (roles || []).filter(rol => rol.estado !== false);

        setAvailableRoles(rolesAdministrativos);
      } catch (error) {
        // Error silencioso - no loggear permisos insuficientes en producción
        if (error.message && error.message.includes('permisos')) {
          // Usuario no tiene permisos suficientes para ver roles
          setAvailableRoles([]);
          console.log('📝 Nota: Los roles no están disponibles para este usuario. El filtro por rol estará limitado.');
        } else {
          // Otro tipo de error, si logear de forma limitada
          console.warn('⚠️ Error al cargar roles para filtrado:', error.message);
          setAvailableRoles([]);
        }
      }
    };

    cargarRolesDisponibles();
  }, []);

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

  // Filtrar administrativos
  useEffect(() => {
    let filtered = Array.isArray(administrativos) ? administrativos : [];

    // Filtro de búsqueda de texto
    if (searchTerm) {
      filtered = filtered.filter(admin => {
        const fullName = `${admin.persona?.nombre_completo || ''} ${admin.persona?.apellido_completo || ''}`.toLowerCase().trim();
        const email = (admin.persona?.correo || '').toLowerCase();
        const employeeCode = (admin.codigo_empleado || '').toLowerCase();

        return fullName.includes(searchTerm.toLowerCase()) ||
          email.includes(searchTerm.toLowerCase()) ||
          employeeCode.includes(searchTerm.toLowerCase());
      });
    }

    // Filtro por estado laboral
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(admin => admin.estado_laboral === statusFilter);
    }

    // Filtro por rol
    if (roleFilter !== 'Todos los roles') {
      filtered = filtered.filter(admin =>
        admin.persona?.roles?.some(rol => {
          const nombre = (rol.nombre_rol || '').trim().toLowerCase();
          return nombre === roleFilter.toLowerCase() ||
            (roleFilter === 'Administrador' && (nombre === 'administrador' || nombre === 'super administrador'));
        })
      );
    }

    // Filtro por fecha de creación
    if (dateFilter !== 'Todos los periodos') {
      if (dateFilter === 'Personalizado' && customDateRange.startDate && customDateRange.endDate) {
        const startDate = new Date(customDateRange.startDate);
        const endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // Fin del día

        filtered = filtered.filter(admin => {
          const adminCreationDate = new Date(admin.fecha_ingreso || admin.persona?.fecha_registro);
          return adminCreationDate >= startDate && adminCreationDate <= endDate;
        });
      } else {
        const range = getDateRange(dateFilter);
        if (range.start && range.end) {
          const startDate = new Date(range.start);
          const endDate = new Date(range.end);
          endDate.setHours(23, 59, 59, 999);

          filtered = filtered.filter(admin => {
            const adminCreationDate = new Date(admin.fecha_ingreso || admin.persona?.fecha_registro);
            return adminCreationDate >= startDate && adminCreationDate <= endDate;
          });
        }
      }
    }

    setFilteredAdministrativos(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, dateFilter, customDateRange, administrativos]);

  // Calcular estadísticas
  const administrativosArray = Array.isArray(administrativos) ? administrativos : [];
  const stats = {
    total: administrativosArray.length,
    activos: administrativosArray.filter(a => a.estado_laboral === 'Activo').length,
    inactivos: administrativosArray.filter(a => a.estado_laboral === 'Inactivo').length,
    suspendidos: administrativosArray.filter(a => a.estado_laboral === 'Suspendido').length,
    retirados: administrativosArray.filter(a => a.estado_laboral === 'Retirado').length,
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAdministrativos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAdministrativos.length / itemsPerPage);

  const handleCreateAdministrativo = async (newAdministrativo) => {
    try {
      await createAdministrativo(newAdministrativo);
      setIsCreateModalOpen(false);
      toast({
        title: "¡Administrativo creado exitosamente!",
        description: "El administrativo ha sido registrado correctamente.",
        variant: "default"
      });
    } catch (error) {
      // Error ya manejado en el contexto
    }
  };

  const handleEditAdministrativo = async (updatedAdministrativo) => {
    try {
      await updateAdministrativoComplete(selectedAdministrativo.id_administrativo, updatedAdministrativo);
      setIsEditModalOpen(false);
      setSelectedAdministrativo(null);
    } catch (error) {
      // Error ya manejado en el contexto
    }
  };

  const handleDeleteAdministrativo = async () => {
    if (isDeletingAdministrativo || !selectedAdministrativo) {
      return;
    }

    setIsDeletingAdministrativo(true);
    try {
      await removeAdministrativo(selectedAdministrativo.id_administrativo);
      setIsDeleteModalOpen(false);
      setSelectedAdministrativo(null);
    } catch (error) {
      // Error ya manejado en el contexto
    } finally {
      setIsDeletingAdministrativo(false);
    }
  };

  const handleCloseDeleteAdministrativoModal = () => {
    if (isDeletingAdministrativo) return;
    setIsDeleteModalOpen(false);
    setSelectedAdministrativo(null);
  };

  const handleViewAdministrativo = (administrativo) => {
    setSelectedAdministrativo(administrativo);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (administrativo) => {
    // Verificar si el administrativo es super admin o admin (Robust Check)
    const isSuperAdminOrAdmin = administrativo?.persona?.roles?.some(rol => {
      const nombre = (rol.nombre_rol || '').trim().toLowerCase();
      const isActive = rol.PersonasRol ? !!rol.PersonasRol.estado : true;
      return (nombre === 'super administrador' || nombre === 'administrador' || nombre === 'admin') && isActive;
    });

    if (isSuperAdminOrAdmin) {
      toast({
        title: "Acción no permitida",
        description: "No se puede editar a un Super Administrador o Administrador",
        variant: "destructive"
      });
      return;
    }

    setSelectedAdministrativo(administrativo);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (administrativo) => {
    setSelectedAdministrativo(administrativo);
    setIsDeleteModalOpen(true);
  };

  const handleStatusChangeRequest = (administrativo, newStatus) => {
    // Verificar si el administrativo es super admin o admin (Robust Check)
    const isSuperAdminOrAdmin = administrativo?.persona?.roles?.some(rol => {
      const nombre = (rol.nombre_rol || '').trim().toLowerCase();
      const isActive = rol.PersonasRol ? !!rol.PersonasRol.estado : true;
      return (nombre === 'super administrador' || nombre === 'administrador' || nombre === 'admin') && isActive;
    });

    if (isSuperAdminOrAdmin) {
      toast({
        title: "Acción no permitida",
        description: "No se puede cambiar el estado de un Super Administrador o Administrador",
        variant: "destructive"
      });
      return;
    }

    setSelectedAdministrativo(administrativo);
    setPendingStatusChange({ administrativoId: administrativo.id_administrativo, newStatus });
    setLoadingStatusChanges(prev => new Set(prev).add(administrativo.id_administrativo));
    setIsStatusChangeModalOpen(true);
  };

  const handleCloseStatusChangeAdministrativoModal = () => {
    if (isChangingAdministrativoStatus) return;
    setLoadingStatusChanges(prev => {
      const newSet = new Set(prev);
      if (pendingStatusChange?.administrativoId) {
        newSet.delete(pendingStatusChange.administrativoId);
      }
      return newSet;
    });
    setIsStatusChangeModalOpen(false);
    setSelectedAdministrativo(null);
    setPendingStatusChange(null);
  };

  const handleStatusChangeConfirm = async () => {
    if (isChangingAdministrativoStatus || !pendingStatusChange) {
      return;
    }

    setIsChangingAdministrativoStatus(true);
    try {
      await changeEstadoAdministrativo(
        selectedAdministrativo.id_administrativo,
        pendingStatusChange.newStatus
      );

      setLoadingStatusChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingStatusChange.administrativoId);
        return newSet;
      });

      setIsStatusChangeModalOpen(false);
      setSelectedAdministrativo(null);
      setPendingStatusChange(null);

      const fullName = `${selectedAdministrativo.persona?.nombre_completo || ''} ${selectedAdministrativo.persona?.apellido_completo || ''}`.trim();
      toast({
        title: "¡Estado actualizado exitosamente!",
        description: `El estado del administrativo ${fullName} ha sido cambiado a ${pendingStatusChange.newStatus}.`,
        variant: "default"
      });
    } catch (error) {
      setLoadingStatusChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingStatusChange.administrativoId);
        return newSet;
      });

      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del administrativo",
        variant: "destructive"
      });
    } finally {
      setIsChangingAdministrativoStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Administrativos</h1>
          <p className="text-slate-600 mt-1">Administra todos los empleados administrativos</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          Nuevo Administrativo
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <StatsCard
          title="Total Administrativos"
          value={stats.total}
          icon={UserCheck}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          textColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatsCard
          title="Activos"
          value={stats.activos}
          icon={UserCheck}
          color="bg-gradient-to-r from-green-500 to-green-600"
          textColor="text-green-600"
          bgColor="bg-green-50"
        />
        <StatsCard
          title="Inactivos"
          value={stats.inactivos}
          icon={UserX}
          color="bg-gradient-to-r from-red-500 to-red-600"
          textColor="text-red-600"
          bgColor="bg-red-50"
        />
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-wrap items-center gap-2 mt-2"
      >
        {/* Search Bar */}
        <div className="flex-1 min-w-[260px]">
          <SearchBar
            placeholder="Buscar por nombre, email o código..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
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
              <SelectTrigger className="h-10 w-full sm:w-[160px]">
                <SelectValue placeholder="Estado laboral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Activo">Activos</SelectItem>
                <SelectItem value="Inactivo">Inactivos</SelectItem>
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
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="h-10 w-full sm:w-[160px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos los roles">Todos los roles</SelectItem>
                {availableRoles.map(rol => (
                  <SelectItem key={rol.id} value={rol.nombre}>
                    {rol.nombre}
                  </SelectItem>
                ))}
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
                <SelectValue placeholder="Fecha de ingreso" />
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
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <AdministrativosTable
          administrativos={currentItems}
          onView={handleViewAdministrativo}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onStatusChange={handleStatusChangeRequest}
          loadingStatusChanges={loadingStatusChanges}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </motion.div>

      {/* Modals */}
      <CreateAdministrativoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAdministrativo}
      />

      <ViewAdministrativoModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        administrativo={selectedAdministrativo}
      />

      <EditAdministrativoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        administrativo={selectedAdministrativo}
        onSubmit={handleEditAdministrativo}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteAdministrativoModal}
        onConfirm={handleDeleteAdministrativo}
        isLoading={isDeletingAdministrativo}
        title="Eliminar Administrativo"
        message={`¿Estás seguro de que deseas eliminar al administrativo ${selectedAdministrativo?.persona?.primer_nombre || ''} ${selectedAdministrativo?.persona?.primer_apellido || ''}? Esta acción no se puede deshacer.`}
      />

      <StatusChangeConfirmModal
        isOpen={isStatusChangeModalOpen}
        onClose={handleCloseStatusChangeAdministrativoModal}
        onConfirm={handleStatusChangeConfirm}
        isLoading={isChangingAdministrativoStatus}
        title="Confirmar Cambio de Estado"
        message="¿Estás seguro de que deseas cambiar el estado laboral de este administrativo?"
        currentStatus={selectedAdministrativo?.estado_laboral}
        newStatus={pendingStatusChange?.newStatus}
        administrativoInfo={
          selectedAdministrativo
            ? {
              nombre: `${selectedAdministrativo.persona?.nombre_completo || ''} ${selectedAdministrativo.persona?.apellido_completo || ''}`.trim(),
              codigo: selectedAdministrativo.codigo_empleado
            }
            : null
        }
      />
    </div>
  );
};

export default AdministrativosPage;

