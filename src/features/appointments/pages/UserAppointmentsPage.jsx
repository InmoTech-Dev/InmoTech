import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Building, Phone, Mail, AlertCircle, CheckCircle, XCircle, List, Grid, Eye, Edit, Trash2, Filter, BarChart3, TrendingUp, User, Sparkles, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select';
import { useToast } from '../../../shared/hooks/use-toast';
import { useAuth } from '../../../shared/contexts/AuthContext';
import citaApiService from '../../../shared/services/citaApiService';
import AppointmentCalendar from '../../../features/dashboard/components/appointment/AppointmentCalendar';
import UserCancelAppointmentModal from '../components/UserCancelAppointmentModal';
import UserEditAppointmentModal from '../components/UserEditAppointmentModal';
import UserViewAppointmentModal from '../components/UserViewAppointmentModal';
import UserCreateAppointmentModal from '../components/UserCreateAppointmentModal';
import UserRescheduleModal from '../components/UserRescheduleModal';

const UserAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [cancelModal, setCancelModal] = useState({ isOpen: false, appointment: null });
  const [editModal, setEditModal] = useState({ isOpen: false, appointment: null });
  const [viewModal, setViewModal] = useState({ isOpen: false, appointment: null });
  const [createModal, setCreateModal] = useState({ isOpen: false, preselectedDate: null });
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, appointment: null, newDate: null });
  const [filter, setFilter] = useState('todos');
  const [calendarKey, setCalendarKey] = useState(0); // Key to force calendar re-render
  const [currentPage, setCurrentPage] = useState(1);
  const APPOINTMENTS_PER_PAGE = 4;
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadUserAppointments();
  }, []);

  const loadUserAppointments = async () => {
    try {
      setLoading(true);
      const data = await citaApiService.obtenerMisCitas();
      // Ordenar por fecha de creación para numeración secuencial
      const sortedData = data.sort((a, b) => new Date(a.fecha_creacion || 0) - new Date(b.fecha_creacion || 0));
      // Agregar numeración secuencial específica del usuario
      const dataWithSequentialIds = sortedData.map((appointment, index) => ({
        ...appointment,
        userAppointmentNumber: index + 1
      }));
      setAppointments(dataWithSequentialIds);
    } catch (error) {
      console.error('Error cargando citas:', error);
      toast({
        title: "Error al cargar citas",
        description: "No se pudieron cargar tus citas. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusConfig = {
      'solicitada': {
        color: 'bg-blue-50 text-blue-700 border border-blue-100',
        icon: AlertCircle,
        label: 'Solicitada'
      },
      'confirmada': {
        color: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        icon: CheckCircle,
        label: 'Confirmada'
      },
      'programada': {
        color: 'bg-amber-50 text-amber-700 border border-amber-100',
        icon: Clock,
        label: 'Programada'
      },
      'completada': {
        color: 'bg-violet-50 text-violet-700 border border-violet-100',
        icon: CheckCircle,
        label: 'Completada'
      },
      'cancelada': {
        color: 'bg-red-50 text-red-700 border border-red-100',
        icon: XCircle,
        label: 'Cancelada'
      },
      're agendada': {
        color: 'bg-orange-50 text-orange-700 border border-orange-100',
        icon: AlertCircle,
        label: 'Re Agendada'
      }
    };
    return statusConfig[status] || statusConfig['solicitada'];
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Fecha no disponible';
    }

    const [year, month, day] = dateString.split('-').map(Number);
    if ([year, month, day].some((value) => Number.isNaN(value))) {
      return 'Fecha no disponible';
    }

    const date = new Date(year, (month || 1) - 1, day || 1);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatHora = (horaString) => {
    // Convertir hora API a formato legible
    return citaApiService.formatHoraDesdeAPI(horaString);
  };

  // Filter appointments based on selected filter
  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'todos') return true;
    if (filter === 'hoy') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const appointmentDate = new Date(appointment.fecha_cita || appointment.fecha);
      appointmentDate.setHours(0, 0, 0, 0);
      return appointmentDate.getTime() === today.getTime();
    }
    return appointment.estado === filter;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Calculate statistics
  const stats = {
    total: appointments.length,
    solicitadas: appointments.filter(a => a.estado === 'solicitada').length,
    confirmadas: appointments.filter(a => a.estado === 'confirmada').length,
    programadas: appointments.filter(a => a.estado === 'programada').length,
    completadas: appointments.filter(a => a.estado === 'completada').length,
    canceladas: appointments.filter(a => a.estado === 'cancelada').length,
    reagendadas: appointments.filter(a => a.estado === 're agendada').length
  };

  const totalAppointments = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalAppointments / APPOINTMENTS_PER_PAGE));
  const startIndex = (currentPage - 1) * APPOINTMENTS_PER_PAGE;
  const paginatedAppointments = viewMode === 'list'
    ? filteredAppointments.slice(startIndex, startIndex + APPOINTMENTS_PER_PAGE)
    : filteredAppointments;
  const showPagination = viewMode === 'list' && totalAppointments >= APPOINTMENTS_PER_PAGE;

  useEffect(() => {
    if (viewMode !== 'list') {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      return;
    }

    const maxPage = Math.max(1, Math.ceil(filteredAppointments.length / APPOINTMENTS_PER_PAGE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredAppointments.length, viewMode, currentPage]);

  const hasReachedEditionLimit = (appointment) => {
    if (!appointment) return false;
    const maxEdits = appointment.ediciones_maximas ?? 2;
    const usedEdits = appointment.ediciones_realizadas ?? 0;
    return usedEdits >= maxEdits;
  };

  // Handler for opening reschedule modal from drag & drop
  const handleOpenRescheduleModal = (appointment, newDate) => {
    if (hasReachedEditionLimit(appointment)) {
      toast({
        title: "Limite de ediciones alcanzado",
        description: `Esta cita ya uso las ${appointment?.ediciones_maximas ?? 2} ediciones permitidas.`,
        variant: "destructive"
      });
      return;
    }

    setRescheduleModal({
      isOpen: true,
      appointment,
      newDate
    });
  };

  // Handler functions for calendar actions
  const handleViewAppointment = (appointment) => {
    setViewModal({ isOpen: true, appointment });
  };

  const handleEditAppointment = (appointment) => {
    if (hasReachedEditionLimit(appointment)) {
      toast({
        title: "Limite de ediciones alcanzado",
        description: "No puedes volver a editar esta cita porque alcanzo el maximo permitido.",
        variant: "destructive"
      });
      return;
    }

    setEditModal({ isOpen: true, appointment });
  };

  const handleCancelAppointment = (appointment) => {
    setCancelModal({ isOpen: true, appointment });
  };

  const handleCreateAppointment = (dateString) => {
    setCreateModal({ isOpen: true, preselectedDate: dateString });
  };

  const handleRescheduleAppointment = async (appointmentId, rescheduleData) => {
    console.log('[INFO] handleRescheduleAppointment llamado con:', { appointmentId, rescheduleData });
try {
      if (!rescheduleData || typeof rescheduleData !== 'object') {
        throw new Error('Datos de reagendamiento invalidos');
      }

      const appointmentToUpdate = appointments.find(
        (appt) => (appt.id_cita || appt.id) === appointmentId
      );

      if (appointmentToUpdate && hasReachedEditionLimit(appointmentToUpdate)) {
        toast({
          title: "Limite de ediciones alcanzado",
          description: "No puedes reagendar esta cita nuevamente.",
          variant: "destructive"
        });
        return;
      }

      // Call API to reschedule appointment
      await citaApiService.reagendarMiCita(appointmentId, rescheduleData);

      // Refresh appointments after successful reschedule
      await loadUserAppointments();

      // Force calendar re-render
      setCalendarKey(prev => prev + 1);

      toast({
        title: "Cita reagendada",
        description: "La cita ha sido reagendada exitosamente.",
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: "Error al reagendar",
        description: error.message || "No se pudo reagendar la cita. Intentalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  // API call handlers
  const performCancelAppointment = async (appointmentId, motivoCancelacion) => {
    try {
      // Cancel API call
      await citaApiService.cancelarMiCitaUsuario(appointmentId, motivoCancelacion);

      // Refresh appointments
      await loadUserAppointments();

      toast({
        title: "Cita cancelada",
        description: "La cita ha sido cancelada exitosamente.",
      });
    } catch (error) {
      console.error('Error canceling appointment:', error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const performEditAppointment = async (appointmentId, updateData) => {
    try {
      // For users editing their own appointments, use the reagendar endpoint
      // Map comentario_edicion to motivo_reagendamiento for API compatibility
      const reagendarData = {
        fecha_cita: updateData.fecha_cita,
        hora_inicio: updateData.hora_inicio,
        hora_fin: updateData.hora_fin,
        motivo_reagendamiento: updateData.comentario_edicion || 'Edición de cita solicitada por el cliente',
        id_servicio: updateData.id_servicio,
        observaciones: updateData.observaciones
      };

      await citaApiService.reagendarMiCita(appointmentId, reagendarData);

      // Refresh appointments
      await loadUserAppointments();

      // Force calendar re-render (in case date/time changed)
      setCalendarKey(prev => prev + 1);

      toast({
        title: "Cita reagendada",
        description: "Los cambios han sido guardados exitosamente.",
      });
    } catch (error) {
      console.error('Error editing appointment:', error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const handleAppointmentCreated = async () => {
    await loadUserAppointments();
    setCalendarKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00457B]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:pt-14 space-y-8">
        {/* Hero Section */}
        <div className="rounded-3xl bg-gradient-to-r from-[#00457B] via-[#005a9e] to-[#0080ff] px-6 py-7 lg:px-10 shadow-lg text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
                  Mis Citas
                </h1>
                <p className="text-sm lg:text-base text-white/80 mt-1">
                  Aquí puedes ver y gestionar todas las citas que has agendado en nuestro sistema.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCreateAppointment(null)}
              className="flex items-center gap-2 bg-white text-[#00457B] font-medium rounded-full px-6 py-2.5 shadow-md hover:bg-slate-50 transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Agendar Nueva Cita
            </button>
          </div>
        </div>

        {/* Upcoming Appointments + Stats Section */}
        {appointments.length > 0 && (
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 px-5 py-5 space-y-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">Próximas Citas</h2>
            </div>

            {/* Mini upcoming appointments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredAppointments
                .filter(appointment => {
                  const appointmentDate = new Date(appointment.fecha_cita || appointment.fecha);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  appointmentDate.setHours(0, 0, 0, 0);
                  return appointmentDate >= today && appointment.estado !== 'cancelada' && appointment.estado !== 'completada';
                })
                .sort((a, b) => new Date(a.fecha_cita || a.fecha) - new Date(b.fecha_cita || b.fecha))
                .slice(0, 3)
                .map((appointment, index) => {
                  const statusInfo = getStatusInfo(appointment.estado);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden"
                    >
                      {/* Status badge */}
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </div>
                          <div className="ml-auto">
                            <span className="text-xs text-slate-500">Cita #{appointment.userAppointmentNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content layout */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="p-1.5 bg-blue-100 rounded-md">
                              <Calendar className="h-4 w-4 text-blue-700" />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-0.5">Fecha</p>
                            <p className="text-sm font-medium text-slate-700">{formatDate(appointment.fecha_cita)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="p-1.5 bg-emerald-100 rounded-md">
                              <Clock className="h-4 w-4 text-emerald-700" />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-0.5">Hora</p>
                            <p className="text-sm font-medium text-slate-700">
                              {appointment.hora_inicio ? formatHora(appointment.hora_inicio) : 'Por confirmar'}
                            </p>
                          </div>
                        </div>

                        {appointment.inmueble && (
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="p-1.5 bg-orange-100 rounded-md">
                                <MapPin className="h-4 w-4 text-orange-700" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-0.5">Ubicación</p>
                              <p className="text-sm font-medium text-slate-700 truncate">{appointment.inmueble.direccion}</p>
                              {appointment.inmueble.ciudad && (
                                <p className="text-xs text-slate-500">{appointment.inmueble.ciudad}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {appointment.servicio && (
                          <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                            <div className="flex-shrink-0 mt-1">
                              <div className="p-1.5 bg-purple-100 rounded-md">
                                <Building className="h-4 w-4 text-purple-700" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-0.5">Servicio</p>
                              <p className="text-sm font-medium text-slate-700">{appointment.servicio.nombre_servicio}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleViewAppointment(appointment)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            Ver
                          </button>
                          {(appointment.estado || '').toLowerCase() !== 'cancelada' && (
                            <>
                              {!hasReachedEditionLimit(appointment) ? (
                                <button
                                  onClick={() => handleEditAppointment(appointment)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                  <Edit className="h-3 w-3" />
                                  Reagendar
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-400 cursor-not-allowed"
                                >
                                  <Edit className="h-3 w-3" />
                                  Límite
                                </button>
                              )}
                              <button
                                onClick={() => handleCancelAppointment(appointment)}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-lg shadow-slate-200/40 hover:shadow-slate-300/50 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute inset-0 rounded-2xl border border-white/60 pointer-events-none"></div>
                <BarChart3 className="h-4 w-4 text-slate-600 mb-1" />
                <div className="text-xl font-semibold text-slate-800">{stats.total}</div>
                <div className="text-xs text-slate-600">Total</div>
              </div>
              <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-blue-100 bg-white shadow-lg shadow-blue-200/30 hover:shadow-blue-300/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
                <AlertCircle className="h-4 w-4 text-blue-600 mb-1" />
                <div className="text-xl font-semibold text-blue-700">{stats.solicitadas}</div>
                <div className="text-xs text-blue-600">Solicitadas</div>
              </div>
              <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-emerald-100 bg-white shadow-lg shadow-emerald-200/30 hover:shadow-emerald-300/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
                <CheckCircle className="h-4 w-4 text-emerald-600 mb-1" />
                <div className="text-xl font-semibold text-emerald-700">{stats.confirmadas}</div>
                <div className="text-xs text-emerald-600">Confirmadas</div>
              </div>
              <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-amber-100 bg-white shadow-lg shadow-amber-200/30 hover:shadow-amber-300/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
                <Clock className="h-4 w-4 text-amber-600 mb-1" />
                <div className="text-xl font-semibold text-amber-700">{stats.programadas}</div>
                <div className="text-xs text-amber-600">Programadas</div>
              </div>
              <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-violet-100 bg-white shadow-lg shadow-violet-200/30 hover:shadow-violet-300/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
                <CheckCircle className="h-4 w-4 text-violet-600 mb-1" />
                <div className="text-xl font-semibold text-violet-700">{stats.completadas}</div>
                <div className="text-xs text-violet-600">Completadas</div>
              </div>
              <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-red-100 bg-white shadow-lg shadow-red-200/30 hover:shadow-red-300/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
                <XCircle className="h-4 w-4 text-red-600 mb-1" />
                <div className="text-xl font-semibold text-red-700">{stats.canceladas}</div>
                <div className="text-xs text-red-600">Canceladas</div>
              </div>
              <div className="relative rounded-2xl px-3 py-3 flex flex-col items-center justify-center text-center border-2 border-orange-100 bg-white shadow-lg shadow-orange-200/30 hover:shadow-orange-300/40 hover:-translate-y-0.5 transition-all duration-200">
                <div className="absolute inset-0 rounded-2xl border border-white/70 pointer-events-none"></div>
                <AlertCircle className="h-4 w-4 text-orange-600 mb-1" />
                <div className="text-xl font-semibold text-orange-700">{stats.reagendadas}</div>
                <div className="text-xs text-orange-600">Re Agendadas</div>
              </div>
            </div>
          </section>
        )}

        {/* Controls */}
        {appointments.length > 0 && (
          <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Filters Row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="inline-flex items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las citas</SelectItem>
                  <SelectItem value="solicitada">Solicitadas</SelectItem>
                  <SelectItem value="confirmada">Confirmadas</SelectItem>
                  <SelectItem value="programada">Programadas</SelectItem>
                  <SelectItem value="completada">Completadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={() => setFilter(filter === 'hoy' ? 'todos' : 'hoy')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all whitespace-nowrap ${
                  filter === 'hoy'
                    ? 'bg-[#00457B] text-white border-[#00457B] hover:bg-[#005a9e]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                Citas de Hoy
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#00457B] text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-[#00457B] text-white shadow-sm'
                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendario
              </button>
            </div>
          </section>
        )}

        {/* Content */}
        {appointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="mb-6">
              <Calendar className="mx-auto h-16 w-16 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">
              ¡No tienes citas agendadas aún!
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Es momento perfecto para agendar tu primera cita. Usa el botón arriba para comenzar.
            </p>
            <button
              onClick={() => handleCreateAppointment(null)}
              className="inline-flex items-center gap-2 bg-[#00457B] text-white font-medium rounded-full px-6 py-3 hover:bg-[#005a9e] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agendar Nueva Cita
            </button>
          </motion.div>
        ) : viewMode === 'calendar' ? (
          <section className="mt-4 rounded-3xl bg-white px-5 py-5 shadow-sm border border-slate-100">
            <AppointmentCalendar
              key={calendarKey}
              citas={filteredAppointments}
              userMode={true}
              onViewAppointment={handleViewAppointment}
              onEditAppointment={handleEditAppointment}
              onDeleteAppointment={handleCancelAppointment}
              onRescheduleAppointment={handleRescheduleAppointment}
              onCreateAppointment={handleCreateAppointment}
              onAcceptAppointment={() => {}}
              onRejectAppointment={() => {}}
              onOpenRescheduleModal={handleOpenRescheduleModal}
            />
          </section>
        ) : (
          <div className="space-y-4">
            {paginatedAppointments.map((appointment, index) => {
              const StatusIcon = getStatusInfo(appointment.estado).icon;
              const statusInfo = getStatusInfo(appointment.estado);
              const editLimitReached = hasReachedEditionLimit(appointment);
              const maxEdits = appointment.ediciones_maximas ?? 2;
              const usedEdits = appointment.ediciones_realizadas ?? 0;

              return (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-5 flex flex-col gap-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cita</div>
                      <div className="text-2xl font-bold text-slate-900">#{appointment.userAppointmentNumber}</div>
                      <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ${statusInfo.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="tracking-wide">{statusInfo.label}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          editLimitReached
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : usedEdits === 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        <Edit className="h-3 w-3" />
                        {usedEdits} / {maxEdits} ediciones
                      </div>
                      {appointment.ediciones_maximas && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          Máx. permitido: {appointment.ediciones_maximas}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Programación
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Calendar className="h-4 w-4 text-[#00457B]" />
                        {formatDate(appointment.fecha_cita)}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                        <Clock className="h-4 w-4 text-[#00457B]" />
                        {appointment.hora_inicio ? formatHora(appointment.hora_inicio) : 'Por confirmar'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Servicio & ubicación
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Building className="h-4 w-4 text-[#00457B]" />
                        {appointment.servicio?.nombre_servicio || 'Servicio pendiente'}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                        <MapPin className="h-4 w-4 text-[#00457B]" />
                        {appointment.inmueble?.direccion || 'Dirección por confirmar'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Notas de la cita
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {appointment.observaciones && appointment.observaciones.trim().length > 0
                          ? appointment.observaciones
                          : 'Sin observaciones registradas.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                      Gestiona esta cita para revisar detalles, reagendar o cancelarla si es necesario.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewAppointment(appointment)}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalles
                      </button>
                      {(appointment.estado || '').toLowerCase() !== 'cancelada' && (
                        <>
                          <button
                            onClick={() => !editLimitReached && handleEditAppointment(appointment)}
                            disabled={editLimitReached}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                              editLimitReached
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-[#00457B] text-white hover:bg-[#005a9e]'
                            }`}
                          >
                            <Edit className="h-4 w-4" />
                            {editLimitReached ? 'Sin cupo' : 'Reagendar'}
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(appointment)}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {showPagination && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <span className="text-sm text-slate-600">
                  Página <span className="font-semibold text-slate-900">{currentPage}</span> de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-[#00457B] text-white hover:bg-[#005a9e]'
                  }`}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modals remain unchanged */}
        <UserCancelAppointmentModal
          isOpen={cancelModal.isOpen}
          onClose={() => setCancelModal({ isOpen: false, appointment: null })}
          appointment={cancelModal.appointment}
          onCancelAppointment={performCancelAppointment}
        />

        <UserEditAppointmentModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, appointment: null })}
          appointment={editModal.appointment}
          onEditAppointment={performEditAppointment}
        />

        <UserViewAppointmentModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal({ isOpen: false, appointment: null })}
          appointment={viewModal.appointment}
        />

        <UserCreateAppointmentModal
          isOpen={createModal.isOpen}
          onClose={() => setCreateModal({ isOpen: false, preselectedDate: null })}
          preselectedDate={createModal.preselectedDate}
          onAppointmentCreate={handleAppointmentCreated}
        />

        <UserRescheduleModal
          isOpen={rescheduleModal.isOpen}
          onClose={() => setRescheduleModal({ isOpen: false, appointment: null, newDate: null })}
          appointment={rescheduleModal.appointment}
          newDate={rescheduleModal.newDate}
          onConfirm={handleRescheduleAppointment}
        />
      </main>
    </div>
  );
};

export default UserAppointmentsPage;
