import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Eye, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle, Grid3X3, List, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
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
  const TABLE_HEADER_ESTIMATED_HEIGHT = 58;
  const TABLE_ROW_ESTIMATED_HEIGHT = 138;
  const TABLE_PAGINATION_ESTIMATED_HEIGHT = 64;
  const TABLE_LAYOUT_SAFETY_MARGIN = 16;

  const { appointments, addAppointment, updateAppointment, deleteAppointment, updateAppointmentStatus } = useAppointments();
  const { user, hasPermission, hasRole } = useAuth(); // Obtener usuario logueado y funciones de permisos
  const [filteredCitas, setFilteredCitas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loadingStatusChanges, setLoadingStatusChanges] = useState(new Set());
  const [isDeletingCita, setIsDeletingCita] = useState(false);
  const [isChangingCitaStatus, setIsChangingCitaStatus] = useState(false);
  const [isAcceptingCita, setIsAcceptingCita] = useState(false);
  const [isRejectingCita, setIsRejectingCita] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const { toast } = useToast();
  const pageContainerRef = useRef(null);
  const controlsContainerRef = useRef(null);
  const tableContentRef = useRef(null);
  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const pendingAppointments = appointmentsArray.filter(cita => cita.estado === 'solicitada');

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

  useEffect(() => {
    if (viewMode === 'calendar') {
      setIsSidebarCollapsed(false);
      return;
    }
    setIsSidebarCollapsed(true);
  }, [viewMode]);

  const calculateAdaptiveItemsPerPage = useCallback(() => {
    if (viewMode !== 'table') return;

    let availableHeight = tableContentRef.current?.clientHeight || 0;

    if (!availableHeight && pageContainerRef.current && controlsContainerRef.current) {
      const rootHeight = pageContainerRef.current.clientHeight;
      const controlsHeight = controlsContainerRef.current.offsetHeight;
      availableHeight = Math.max(rootHeight - controlsHeight, 0);
    }

    let nextItemsPerPage = 1;
    for (const candidateRows of [3, 2, 1]) {
      const requiredHeight =
        TABLE_HEADER_ESTIMATED_HEIGHT +
        (TABLE_ROW_ESTIMATED_HEIGHT * candidateRows) +
        TABLE_PAGINATION_ESTIMATED_HEIGHT +
        TABLE_LAYOUT_SAFETY_MARGIN;

      if (availableHeight >= requiredHeight) {
        nextItemsPerPage = candidateRows;
        break;
      }
    }

    setItemsPerPage((prev) => (prev === nextItemsPerPage ? prev : nextItemsPerPage));
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'table') return;

    calculateAdaptiveItemsPerPage();

    const handleResize = () => {
      calculateAdaptiveItemsPerPage();
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        calculateAdaptiveItemsPerPage();
      });

      [pageContainerRef.current, controlsContainerRef.current, tableContentRef.current].forEach((node) => {
        if (node) resizeObserver.observe(node);
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [
    viewMode,
    isSidebarCollapsed,
    isAlertDismissed,
    pendingAppointments.length,
    calculateAdaptiveItemsPerPage
  ]);


  // Función para filtrar por citas de hoy
  const handleFilterToday = () => {
    setDateFilter(dateFilter === 'today' ? 'all' : 'today');
    setStatusFilter('Todos los estados'); // Reset status filter when filtering by date
    setSearchTerm(''); // Reset search when filtering by date
  };

  // Calcular estadísticas
  const stats = {
    total: appointmentsArray.length,
    programadas: appointmentsArray.filter(c => c.estado === 'programada').length,
    confirmadas: appointmentsArray.filter(c => c.estado === 'confirmada').length,
    canceladas: appointmentsArray.filter(c => c.estado === 'cancelada').length,
    completadas: appointmentsArray.filter(c => c.estado === 'completada').length,
    're agendada': appointmentsArray.filter(c => c.estado === 're agendada').length,
    solicitada: appointmentsArray.filter(c => c.estado === 'solicitada').length
  };

  // Detectar citas solicitadas pendientes >24 horas (para otras funcionalidades)
  const oldPendingAppointments = appointmentsArray.filter(cita => {
    if (cita.estado !== 'solicitada') return false;
    const fechaCreacion = new Date(cita.fechaCreacion || cita.fecha);
    const now = new Date();
    const diffTime = Math.abs(now - fechaCreacion);
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours > 24; // Más de 24 horas
  });

  // Paginación (blindaje defensivo para mantener 1..3 elementos por página)
  const safeItemsPerPage = Math.min(Math.max(itemsPerPage || 1, 1), 3);
  const indexOfLastItem = currentPage * safeItemsPerPage;
  const indexOfFirstItem = indexOfLastItem - safeItemsPerPage;
  const currentItems = filteredCitas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCitas.length / safeItemsPerPage);

  useEffect(() => {
    const safeTotalPages = Math.max(totalPages, 1);
    setCurrentPage((prev) => Math.min(prev, safeTotalPages));
  }, [totalPages]);

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

  const handleEditCita = async (updatedCita) => {
    const citaId = updatedCita?.id || updatedCita?.id_cita;
    if (!citaId) {
      throw new Error("No se pudo identificar la cita a actualizar.");
    }

    const citaActualizada = await updateAppointment({
      ...updatedCita,
      id: citaId,
      id_cita: citaId
    });

    setIsEditModalOpen(false);
    setSelectedCita(null);
    return citaActualizada;
  };

  const handleDeleteCita = async () => {
    if (isDeletingCita || !selectedCita) {
      return;
    }

    setIsDeletingCita(true);
    try {
      const updatedCita = {
        ...selectedCita,
        estado: 'cancelada'
      };
      await updateAppointment(updatedCita);
      setIsDeleteModalOpen(false);
      setSelectedCita(null);
      toast({
        title: "¡Cita cancelada exitosamente!",
        description: "La cita ha sido marcada como cancelada.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error al cancelar cita",
        description: error.message || "No se pudo cancelar la cita.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingCita(false);
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

  const handleCloseStatusChangeModal = () => {
    if (isChangingCitaStatus) {
      return;
    }

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
  };

  const handleStatusChangeConfirm = async () => {
    if (isChangingCitaStatus || !pendingStatusChange) {
      return;
    }

    setIsChangingCitaStatus(true);
    try {
      await updateAppointmentStatus(selectedCita.id, citaApiService.mapEstadoToId(pendingStatusChange.newStatus));

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
    } catch (error) {
      setLoadingStatusChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingStatusChange.citaId);
        return newSet;
      });

      toast({
        title: "Error al actualizar estado",
        description: error.message || "No se pudo cambiar el estado de la cita.",
        variant: "destructive"
      });
    } finally {
      setIsChangingCitaStatus(false);
    }
  };

  const handleCloseDeleteCitaModal = () => {
    if (isDeletingCita) {
      return;
    }

    setIsDeleteModalOpen(false);
    setSelectedCita(null);
  };

  const handleAcceptAppointmentRequest = (cita) => {
    if (isAcceptingCita || isRejectingCita) {
      return;
    }
    setSelectedCita(cita);
    setIsAcceptDialogOpen(true);
  };

  const handleRejectAppointmentRequest = (cita) => {
    if (isAcceptingCita || isRejectingCita) {
      return;
    }
    setSelectedCita(cita);
    setIsRejectDialogOpen(true);
  };

  const handleCloseAcceptDialog = () => {
    if (isAcceptingCita) {
      return;
    }
    setIsAcceptDialogOpen(false);
    setSelectedCita(null);
  };

  const handleCloseRejectDialog = () => {
    if (isRejectingCita) {
      return;
    }
    setIsRejectDialogOpen(false);
    setSelectedCita(null);
  };

  const handleAcceptAppointment = async () => {
    if (isAcceptingCita) {
      return;
    }

    setIsAcceptingCita(true);
    try {
      if (!selectedCita || !user?.id) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo identificar al usuario.",
          variant: "destructive"
        });
        return;
      }

      const respuesta = await citaApiService.confirmarCita(selectedCita.id, user.id);

      await updateAppointment({
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
    } finally {
      setIsAcceptingCita(false);
    }
  };

  const handleRejectAppointment = async () => {
    if (isRejectingCita || !selectedCita) {
      return;
    }

    setIsRejectingCita(true);
    try {
      await updateAppointmentStatus(selectedCita.id, 6); // 6 = cancelada
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
    } catch (error) {
      toast({
        title: "Error al rechazar cita",
        description: error.message || "No se pudo rechazar la cita.",
        variant: "destructive"
      });
    } finally {
      setIsRejectingCita(false);
    }
  };

  const handleRescheduleAppointment = async (appointmentId, reagendamientoData) => {
    const appointmentsArray = Array.isArray(appointments) ? appointments : [];
    const updatedCita = appointmentsArray.find(
      cita => cita.id === appointmentId || cita.id_cita === appointmentId
    );
    const formatearFechaSinDesfase = (fechaIso) => {
      if (!fechaIso || typeof fechaIso !== 'string') return 'fecha no disponible';
      const [anio, mes, dia] = fechaIso.split('-').map(Number);
      if ([anio, mes, dia].some(Number.isNaN)) return fechaIso;
      return new Date(anio, mes - 1, dia).toLocaleDateString('es-ES');
    };

    if (!updatedCita) {
      throw new Error('No se encontro la cita a reagendar');
    }

    try {
      const horaInicioNormalizada = citaApiService.formatHoraParaAPI(
        reagendamientoData.hora_inicio || updatedCita.hora_inicio
      );
      const horaFinReagendada = citaApiService.calcularHoraFin(horaInicioNormalizada);

      await updateAppointment({
        ...updatedCita,
        ...reagendamientoData,
        hora_inicio: horaInicioNormalizada,
        hora_fin: horaFinReagendada,
        estado: 're agendada'
      });

      toast({
        title: 'Cita reagendada exitosamente',
        description: `La cita ha sido movida a ${formatearFechaSinDesfase(reagendamientoData.fecha_cita)} y cambio al estado "Re Agendada".`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error al reagendar cita',
        description: error.message || 'No se pudo reagendar la cita.',
        variant: 'destructive'
      });
      throw error;
    }
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
    <div ref={pageContainerRef} className="flex h-[calc(100vh-200px)] overflow-hidden">
      {/* Main Content Area - No Scroll */}
      <div className={`flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden ${isSidebarCollapsed ? 'pr-0' : 'pr-4'}`}>
        <div ref={controlsContainerRef} className="flex-shrink-0 space-y-2">
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
              {viewMode === 'table' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300"
                >
                  {isSidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                  {isSidebarCollapsed ? 'Mostrar Panel' : 'Ocultar Panel'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Content - Takes remaining space, no scroll */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          ref={tableContentRef}
          className="flex-1 min-h-0 overflow-hidden"
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
      {!isSidebarCollapsed && (
        <AppointmentSidebar
          citas={appointments}
          onAppointmentClick={handleViewCita}
        />
      )}

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
        onClose={handleCloseDeleteCitaModal}
        onConfirm={handleDeleteCita}
        isLoading={isDeletingCita}
        title="Cancelar Cita"
        message={`¿Estás seguro de que deseas cancelar la cita con ${typeof selectedCita?.cliente === 'object' ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`.trim() : selectedCita?.cliente}? La cita pasará al estado "Cancelada".`}
      />

      <StatusChangeConfirmModal
        isOpen={isStatusChangeModalOpen}
        onClose={handleCloseStatusChangeModal}
        onConfirm={handleStatusChangeConfirm}
        isLoading={isChangingCitaStatus}
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
        onClose={handleCloseAcceptDialog}
        onConfirm={handleAcceptAppointment}
        isLoading={isAcceptingCita}
        title="Aceptar Cita Solicitada"
        message={`¿Estás seguro de que deseas aceptar la cita solicitada con ${typeof selectedCita?.cliente === 'object' ? `${selectedCita.cliente.nombre_completo} ${selectedCita.cliente.apellido_completo}`.trim() : selectedCita?.cliente}? La cita pasará al estado "Confirmada".`}
        confirmText="Aceptar Cita"
        cancelText="Cancelar"
        variant="success"
      />

      <ConfirmationDialog
        isOpen={isRejectDialogOpen}
        onClose={handleCloseRejectDialog}
        onConfirm={handleRejectAppointment}
        isLoading={isRejectingCita}
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