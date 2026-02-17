import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Eye, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle, Grid3X3, List, X } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import AppointmentTable from '../../components/appointment/AppointmentTable';
import AppointmentCalendar from '../../components/appointment/AppointmentCalendar';
import AppointmentSidebar from '../../components/appointment/AppointmentSidebar';
import CreateAppointmentModal from '../../components/appointment/CreateAppointmentModal';
import ViewAppointmentModal from '../../components/appointment/ViewAppointmentModal';
import EditAppointmentModal from '../../components/appointment/EditAppointmentModal';
import DeleteConfirmModal from '../../../../shared/components/modals/DeleteConfirmModal';
import StatusChangeConfirmModal from '../../../../shared/components/modals/StatusChangeConfirmModal';
import ConfirmationDialog from '../../../../shared/components/ui/ConfirmationDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../shared/components/ui/select';
import { useToast } from '../../../../shared/hooks/use-toast';
import { useAppointments } from '../../../../shared/contexts/AppointmentContext';
import citaApiService from '../../../../shared/services/citaApiService';
import { useAuth } from '../../../../shared/contexts/AuthContext';

const CitasPage = () => {
  const { appointments, addAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus } = useAppointments();
  const { user, hasPermission, hasRole } = useAuth(); // Obtener usuario logueado y funciones de permisos
  const [filteredCitas, setFilteredCitas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'table' or 'calendar' - Default to calendar
  const [loadingStatusChanges, setLoadingStatusChanges] = useState(new Set());
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const { toast } = useToast();

  // Filtrar citas
  useEffect(() => {
    let filtered = Array.isArray(appointments) ? appointments : [];

    if (searchTerm) {
      filtered = filtered.filter(cita => {
        const clientName = typeof cita.cliente === 'object'
          ? `${cita.cliente?.nombre_completo || ''} ${cita.cliente?.apellido_completo || ''}`.toLowerCase()
          : (cita.cliente || '').toLowerCase();
        const propertyName = typeof cita.inmueble === 'object'
          ? (cita.inmueble?.direccion || '').toLowerCase()
          : (cita.propiedad || '').toLowerCase();
        const email = typeof cita.cliente === 'object'
          ? (cita.cliente?.correo || '').toLowerCase()
          : (cita.email || '').toLowerCase();
        return clientName.includes(searchTerm.toLowerCase()) ||
          propertyName.includes(searchTerm.toLowerCase()) ||
          email.includes(searchTerm.toLowerCase());
      });
    }

    if (statusFilter !== 'Todos los estados') {
      filtered = filtered.filter(cita => cita.estado === statusFilter);
    }

    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(cita => cita.fecha === today);
    }

    setFilteredCitas(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, appointments]);

  // Reset alert dismissal when component mounts (alert appears again each time user enters module)
  useEffect(() => {
    setIsAlertDismissed(false);
  }, []);


  // Función para filtrar por citas de hoy
  const handleFilterToday = () => {
    setDateFilter(dateFilter === 'today' ? 'all' : 'today');
    setStatusFilter('Todos los estados'); // Reset status filter when filtering by date
    setSearchTerm(''); // Reset search when filtering by date
  };

  // Calcular estadísticas
  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const stats = {
    total: appointmentsArray.length,
    programadas: appointmentsArray.filter(c => c.estado === 'programada').length,
    confirmadas: appointmentsArray.filter(c => c.estado === 'confirmada').length,
    canceladas: appointmentsArray.filter(c => c.estado === 'cancelada').length,
    completadas: appointmentsArray.filter(c => c.estado === 'completada').length,
    're agendada': appointmentsArray.filter(c => c.estado === 're agendada').length,
    solicitada: appointmentsArray.filter(c => c.estado === 'solicitada').length
  };

  // Detectar citas solicitadas pendientes
  const pendingAppointments = appointmentsArray.filter(cita => cita.estado === 'solicitada');

  // Detectar citas solicitadas pendientes >24 horas (para otras funcionalidades)
  const oldPendingAppointments = appointmentsArray.filter(cita => {
    if (cita.estado !== 'solicitada') return false;
    const fechaCreacion = new Date(cita.fechaCreacion || cita.fecha);
    const now = new Date();
    const diffTime = Math.abs(now - fechaCreacion);
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours > 24; // Más de 24 horas
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCitas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCitas.length / itemsPerPage);

  const handleCreateCita = async (newCita) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo identificar al usuario.",
          variant: "destructive"
        });
        return;
      }

      // Usar la API real enviando el id_usuario_creador
      const citaCreada = await citaApiService.crearCita(newCita, user.id);

      // Agregar la cita creada al contexto
      addAppointment(citaCreada);

      setIsCreateModalOpen(false);
      setPreselectedDate(null);
      toast({
        title: "¡Cita creada exitosamente!",
        description: "La cita ha sido agendada correctamente.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error creando cita:", error);
      toast({
        title: "Error al crear cita",
        description: error.message || "No se pudo crear la cita.",
        variant: "destructive"
      });
    }
  };

  const handleEditCita = (updatedCita) => {
    // Verificar que tenemos el ID correcto
    if (!updatedCita.id) {
      toast({
        title: "Error al actualizar",
        description: "No se pudo identificar la cita a actualizar.",
        variant: "destructive"
      });
      return;
    }

    updateAppointment(updatedCita);

    setIsEditModalOpen(false);
    setSelectedCita(null);
    toast({
      title: "¡Cita actualizada exitosamente!",
      description: "Los cambios han sido guardados correctamente.",
      variant: "default"
    });
  };

  const handleDeleteCita = () => {
    // En vez de eliminar, cambiamos el estado a 'cancelada'
    if (selectedCita) {
      const updatedCita = {
        ...selectedCita,
        estado: 'cancelada'
      };
      updateAppointment(updatedCita);
      setIsDeleteModalOpen(false);
      setSelectedCita(null);
      toast({
        title: "¡Cita cancelada exitosamente!",
        description: "La cita ha sido marcada como cancelada.",
        variant: "default"
      });
    }
  };

  const handleViewCita = (cita) => {
    setSelectedCita(cita);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (cita) => {
    setSelectedCita(cita);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (cita) => {
    setSelectedCita(cita);
    setIsDeleteModalOpen(true);
  };

  const handleStatusChangeRequest = (cita, newStatus) => {
    // newStatus ahora es el ID del estado, mapear a nombre
    const estadoNombre = citaApiService.mapIdToEstado(newStatus);
    setSelectedCita(cita);
    setPendingStatusChange({ citaId: cita.id, newStatus: estadoNombre });
    setLoadingStatusChanges(prev => new Set(prev).add(cita.id));
    setIsStatusChangeModalOpen(true);
  };

  const handleStatusChangeConfirm = () => {
    if (pendingStatusChange) {
      // Usar updateAppointmentStatus para actualizar solo el estado
      updateAppointmentStatus(selectedCita.id, citaApiService.mapEstadoToId(pendingStatusChange.newStatus));

      setLoadingStatusChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingStatusChange.citaId);
        return newSet;
      });

      setIsStatusChangeModalOpen(false);
      setSelectedCita(null);
      setPendingStatusChange(null);

      toast({
        title: "¡Estado actualizado exitosamente!",
        description: `El estado de la cita ha sido cambiado a ${getStatusLabel(pendingStatusChange.newStatus)}.`,
        variant: "default"
      });
    }
  };

  const handleAcceptAppointmentRequest = (cita) => {
    setSelectedCita(cita);
    setIsAcceptDialogOpen(true);
  };

  const handleRejectAppointmentRequest = (cita) => {
    setSelectedCita(cita);
    setIsRejectDialogOpen(true);
  };

  const handleAcceptAppointment = async () => {
    if (selectedCita && user?.id) {
      try {
        // Llamar al backend para confirmar la cita asignando el agente
        const respuesta = await citaApiService.confirmarCita(selectedCita.id, user.id);

        // Actualizar en el contexto local con la respuesta del backend
        // La cita ya está confirmada en el backend
        updateAppointment({
          ...respuesta,
          estado: respuesta.estado || 'confirmada',
          id_agente_asignado: user.id,
          agente: respuesta.agente || {
            id_agente: user.id_agente || user.id_persona || user.id,
            nombre_completo: user.nombre_completo || user.nombre || '',
            apellido_completo: user.apellido_completo || user.apellidos || '',
            numero_documento: user.numero_documento || user.documento || '',
            correo: user.correo || user.email || user.email_usuario
          },
          _skipApi: true
        });

        setIsAcceptDialogOpen(false);
        setSelectedCita(null);

        const clientName = typeof selectedCita.cliente === 'object'
          ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`.trim()
          : selectedCita.cliente;

        toast({
          title: "¡Cita aceptada exitosamente!",
          description: `La cita con ${clientName} ha sido confirmada asignada a ti.`,
          variant: "default"
        });
      } catch (error) {
        console.error("Error aceptando cita:", error);
        toast({
          title: "Error al aceptar cita",
          description: error.message || "No se pudo aceptar la cita.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Error de autenticación",
        description: "No se pudo identificar al usuario.",
        variant: "destructive"
      });
    }
  };

  const handleRejectAppointment = () => {
    if (selectedCita) {
      // Usar el endpoint específico para cambiar solo el estado
      updateAppointmentStatus(selectedCita.id, 6); // 6 = cancelada
      setIsRejectDialogOpen(false);
      setSelectedCita(null);
      const clientName = typeof selectedCita.cliente === 'object'
        ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`.trim()
        : selectedCita.cliente;
      toast({
        title: "¡Cita rechazada exitosamente!",
        description: `La cita con ${clientName} ha sido cancelada.`,
        variant: "default"
      });
    }
  };

  const handleRescheduleAppointment = (appointmentId, newDate) => {
    const appointmentsArray = Array.isArray(appointments) ? appointments : [];
    const updatedCita = appointmentsArray.find(cita => cita.id === appointmentId);
    if (updatedCita) {
      updateAppointment({
        ...updatedCita,
        fecha: newDate,
        estado: 're agendada'
      });
    }

    toast({
      title: "¡Cita reagendada exitosamente!",
      description: `La cita ha sido movida a ${new Date(newDate).toLocaleDateString('es-ES')} y cambió al estado "Re Agendada".`,
      variant: "default"
    });
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      programada: 'Programada',
      confirmada: 'Confirmada',
      completada: 'Completada',
      cancelada: 'Cancelada',
      're agendada': 'Re Agendada',
      solicitada: 'Solicitada'
    };
    return statusLabels[status] || status;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] overflow-hidden">
      {/* Main Content Area - No Scroll */}
      <div className="flex-1 flex flex-col space-y-2 overflow-hidden pr-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 flex-shrink-0"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestión de Citas</h1>
            <p className="text-sm text-slate-600">Administra todas las citas de tus clientes</p>
          </div>
          {/* Botón aparece siempre pero deshabilitado si no tiene permisos */}
          <motion.button
            disabled={!hasPermission("citas", "crear")}
            whileHover={hasPermission("citas", "crear") ? { scale: 1.02 } : {}}
            whileTap={hasPermission("citas", "crear") ? { scale: 0.98 } : {}}
            onClick={() => hasPermission("citas", "crear") ? setIsCreateModalOpen(true) : null}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${hasPermission("citas", "crear") ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl' : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50'}`}
            title={hasPermission("citas", "crear") ? "Crear nueva cita" : "No tienes permiso para crear citas"}
          >
            <Plus className="w-4 h-4" />
            Nueva Cita
          </motion.button>
        </motion.div>

        {/* Pending Appointments Alert */}
        {pendingAppointments.length > 0 && !isAlertDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex-shrink-0"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs font-medium text-yellow-800">
                  Citas Solicitadas Pendientes
                </h3>
                <p className="text-xs text-yellow-700">
                  Hay {pendingAppointments.length} cita{pendingAppointments.length > 1 ? 's' : ''} solicitada{pendingAppointments.length > 1 ? 's' : ''} que llevan más de 24 horas sin respuesta.
                  <button
                    onClick={() => setStatusFilter('solicitada')}
                    className="ml-2 text-yellow-800 underline hover:text-yellow-900 font-medium"
                  >
                    Ver citas solicitadas
                  </button>
                </p>
              </div>
              <button
                onClick={() => setIsAlertDismissed(true)}
                className="flex-shrink-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-lg p-1 transition-colors"
                aria-label="Cerrar alerta"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-shrink-0"
        >
          <div className="flex-1 max-w-md">
            <SearchBar
              placeholder="Buscar por cliente, propiedad o email..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Status Filter */}
            <div className="w-[180px]">
              <Select
                value={statusFilter === 'solicitada' ? 'Todos los estados' : statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full bg-white border-slate-200">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos los estados">Todos los estados</SelectItem>
                  <SelectItem value="programada">Programadas</SelectItem>
                  <SelectItem value="confirmada">Confirmadas</SelectItem>
                  <SelectItem value="completada">Completadas</SelectItem>
                  <SelectItem value="re agendada">Re Agendadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                  <SelectItem value="solicitada">Solicitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFilterToday}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${dateFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300'
                }`}
            >
              <Calendar className="w-4 h-4" />
              {dateFilter === 'today' ? 'Todas las fechas' : 'Citas de hoy'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStatusFilter(statusFilter === 'solicitada' ? 'Todos los estados' : 'solicitada')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${statusFilter === 'solicitada'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300'
                }`}
            >
              <Eye className="w-4 h-4" />
              {statusFilter === 'solicitada' ? 'Ocultar Solicitadas' : 'Ver Solicitadas'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${viewMode === 'calendar'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-green-300'
                }`}
            >
              {viewMode === 'table' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              {viewMode === 'table' ? 'Vista Calendario' : 'Vista Tabla'}
            </motion.button>
          </div>
        </motion.div>

        {/* Content - Takes remaining space, no scroll */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex-1 overflow-hidden"
        >
          {viewMode === 'table' ? (
            <AppointmentTable
              citas={currentItems}
              onView={handleViewCita}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onStatusChange={handleStatusChangeRequest}
              onAcceptAppointment={handleAcceptAppointmentRequest}
              onRejectAppointment={handleRejectAppointmentRequest}
              loadingStatusChanges={loadingStatusChanges}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : (
            <AppointmentCalendar
              citas={filteredCitas}
              onViewAppointment={handleViewCita}
              onEditAppointment={handleEditClick}
              onDeleteAppointment={handleDeleteClick}
              onRescheduleAppointment={handleRescheduleAppointment}
              onCreateAppointment={(dateString) => {
                setPreselectedDate(dateString);
                setIsCreateModalOpen(true);
              }}
              onAcceptAppointment={handleAcceptAppointmentRequest}
              onRejectAppointment={handleRejectAppointmentRequest}
            />
          )}
        </motion.div>
      </div>

      {/* Right Sidebar - Only scrollable element */}
      <AppointmentSidebar
        citas={appointments}
        onAppointmentClick={handleViewCita}
      />

      {/* Modals */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPreselectedDate(null);
        }}
        onSubmit={handleCreateCita}
        preselectedDate={preselectedDate}
      />

      <ViewAppointmentModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        cita={selectedCita}
      />

      <EditAppointmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        cita={selectedCita}
        onSubmit={handleEditCita}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCita}
        title="Cancelar Cita"
        message={`¿Estás seguro de que deseas cancelar la cita con ${typeof selectedCita?.cliente === 'object' ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`.trim() : selectedCita?.cliente}? La cita pasará al estado "Cancelada".`}
      />

      <StatusChangeConfirmModal
        isOpen={isStatusChangeModalOpen}
        onClose={() => {
          setLoadingStatusChanges(prev => {
            const newSet = new Set(prev);
            if (pendingStatusChange?.citaId) {
              newSet.delete(pendingStatusChange.citaId);
            }
            return newSet;
          });
          setIsStatusChangeModalOpen(false);
          setSelectedCita(null);
          setPendingStatusChange(null);
        }}
        onConfirm={handleStatusChangeConfirm}
        title="Confirmar Cambio de Estado"
        message="¿Estás seguro de que deseas cambiar el estado de esta cita?"
        currentStatus={selectedCita?.estado}
        newStatus={pendingStatusChange?.newStatus}
        citaInfo={
          selectedCita
            ? {
              cliente: typeof selectedCita.cliente === 'object'
                ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`
                : selectedCita.cliente,
              propiedad: selectedCita.propiedad,
              fecha: selectedCita.fecha,
              hora: selectedCita.hora
            }
            : null
        }
      />

      {/* Confirmation Dialogs for Accept/Reject */}
      <ConfirmationDialog
        isOpen={isAcceptDialogOpen}
        onClose={() => {
          setIsAcceptDialogOpen(false);
          setSelectedCita(null);
        }}
        onConfirm={handleAcceptAppointment}
        title="Aceptar Cita Solicitada"
        message={`¿Estás seguro de que deseas aceptar la cita solicitada con ${typeof selectedCita?.cliente === 'object' ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`.trim() : selectedCita?.cliente}? La cita pasará al estado "Confirmada".`}
        confirmText="Aceptar Cita"
        cancelText="Cancelar"
        variant="success"
      />

      <ConfirmationDialog
        isOpen={isRejectDialogOpen}
        onClose={() => {
          setIsRejectDialogOpen(false);
          setSelectedCita(null);
        }}
        onConfirm={handleRejectAppointment}
        title="Rechazar Cita Solicitada"
        message={`¿Estás seguro de que deseas rechazar la cita solicitada con ${typeof selectedCita?.cliente === 'object' ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`.trim() : selectedCita?.cliente}? La cita pasará al estado "Cancelada".`}
        confirmText="Rechazar Cita"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default CitasPage;
