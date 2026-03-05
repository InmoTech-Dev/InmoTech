import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, FileText, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import citaApiService from '../../../../shared/services/citaApiService';

const RescheduleAppointmentModal = ({ isOpen, onClose, cita, onRescheduled }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fecha_cita: '',
    hora_inicio: '',
    motivo_reagendamiento: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Cargar agentes disponibles al abrir el modal
  useEffect(() => {
    if (isOpen && !agents.length) {
      loadAgents();
    }
  }, [isOpen]);

  // Efecto para cargar horarios cuando cambia la fecha o el servicio
  useEffect(() => {
    if (formData.fecha_cita && cita?.id_servicio) {
      loadAvailableTimes(formData.fecha_cita, cita.id_servicio);
    }
  }, [formData.fecha_cita, cita?.id_servicio]);

  const [currentAppointmentTime, setCurrentAppointmentTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Cargar horarios disponibles cuando cambia la fecha y servicio
  const loadAvailableTimes = async (fecha, id_servicio) => {
    if (!fecha || !id_servicio) return;

    setLoadingTimes(true);
    try {
      // Crear payload para obtener horarios disponibles
      const disponibilidadData = {
        fecha_cita: fecha,
        id_agente: cita?.id_agente_asignado || null,
        id_servicio: id_servicio
      };

      console.log('🔍 Solicitando horarios disponibles:', disponibilidadData);

      const response = await citaApiService.obtenerHorariosDisponibles(disponibilidadData);
      setAvailableTimes(response);
    } catch (error) {
      console.error('Error cargando horarios disponibles:', error);
      // En caso de error, mostrar horarios predeterminados
      const defaultTimes = [];
      // Mañana: 8:00 AM - 1:00 PM (último inicio 12:30)
      for (let hora = 8; hora <= 12; hora++) {
        defaultTimes.push(`${hora.toString().padStart(2, '0')}:00`);
        if (hora !== 12) {
          defaultTimes.push(`${hora.toString().padStart(2, '0')}:30`);
        } else {
          defaultTimes.push(`12:30`);
        }
      }
      // Tarde: 2:00 PM - 5:00 PM (último inicio 16:30)
      for (let hora = 14; hora <= 16; hora++) {
        defaultTimes.push(`${hora.toString().padStart(2, '0')}:00`);
        defaultTimes.push(`${hora.toString().padStart(2, '0')}:30`);
      }
      setAvailableTimes(defaultTimes);
    } finally {
      setLoadingTimes(false);
    }
  };

  // Inicializar datos del formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && cita) {
      // Obtener la fecha actual
      const currentDate = cita.fecha_cita || cita.fecha;
      const currentTime = cita.hora_inicio || cita.hora;

      // Formatear hora actual para mostrar (en formato legible)
      let currentTimeDisplay = 'No disponible';
      if (currentTime) {
        if (currentTime.includes('T')) {
          try {
            const date = new Date(currentTime);
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const isPM = hours >= 12;
            const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
            currentTimeDisplay = `${hours12}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
          } catch (error) {
            console.error('Error parsing tiempo actual:', error);
            currentTimeDisplay = currentTime;
          }
        } else if (currentTime.includes('AM') || currentTime.includes('PM')) {
          currentTimeDisplay = currentTime;
        } else {
          currentTimeDisplay = currentTime;
        }
      }
      setCurrentAppointmentTime(currentTimeDisplay);

      // Convertir hora al formato HH:mm para el input time
      let timeFormatted = currentTime;
      if (currentTime) {
        // Si es timestamp ISO (1970-01-01T14:30:00.000Z)
        if (currentTime.includes('T')) {
          try {
            const date = new Date(currentTime);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            timeFormatted = `${hours}:${minutes}`;
          } catch (error) {
            console.error('Error parsing tiempo ISO:', error);
            timeFormatted = '09:00';
          }
        }
        // Si es formato 12 horas (10:30 AM)
        else if (currentTime.includes('AM') || currentTime.includes('PM')) {
          const timeParts = currentTime.replace(/\s+/g, '').toLowerCase();
          let [time, period] = timeParts.split(/(am|pm)/).filter(Boolean);

          if (period === 'pm' && !time.startsWith('12')) {
            const [hours, minutes] = time.split(':');
            const hours24 = parseInt(hours) + 12;
            timeFormatted = `${hours24.toString().padStart(2, '0')}:${minutes}`;
          } else if (period === 'am' && time.startsWith('12')) {
            timeFormatted = `00:${time.split(':')[1]}`;
          } else {
            timeFormatted = time;
          }
        }
        // Si ya es HH:mm
        else if (currentTime.match(/^(\d{1,2}):(\d{2})$/)) {
          timeFormatted = currentTime;
        }
        // Fallback
        else {
          timeFormatted = '09:00';
        }
      }

      setFormData({
        fecha_cita: currentDate || '',
        hora_inicio: timeFormatted || '09:00',
        motivo_reagendamiento: ''
      });
      setErrors({});
    }
  }, [isOpen, cita]);

  const loadAgents = async () => {
    try {
      setLoadingAgents(true);
      const agentsList = await citaApiService.obtenerAgentesDisponibles();
      setAgents(agentsList);
    } catch (error) {
      console.error('Error loading agents:', error);
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar fecha
    if (!formData.fecha_cita) {
      newErrors.fecha_cita = 'La fecha es obligatoria';
    } else {
      const [y, m, d] = formData.fecha_cita.split('-').map(Number);
      const selectedDate = new Date(y, m - 1, d);
      selectedDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.fecha_cita = 'La fecha no puede ser anterior a hoy';
      }
    }

    // Validar hora
    if (!formData.hora_inicio) {
      newErrors.hora_inicio = 'La hora es obligatoria';
    }

    // Validar motivo
    if (!formData.motivo_reagendamiento || formData.motivo_reagendamiento.trim().length < 10) {
      newErrors.motivo_reagendamiento = 'El motivo debe tener al menos 10 caracteres';
    } else if (formData.motivo_reagendamiento.length > 500) {
      newErrors.motivo_reagendamiento = 'El motivo no puede exceder 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 🛡️ VALIDACIÓN FINAL: Verificar que el horario siga disponible justo antes de reagendar
      const idServicio = cita.id_servicio || 1;

      if (idServicio === 1) { // Solo para "Visita a Propiedad"
        console.log("🔍 Validando disponibilidad final para reagendar Visita a Propiedad:", {
          fecha: formData.fecha_cita,
          hora_inicio: formData.hora_inicio,
          servicio: idServicio
        });

        // Consultar horarios disponibles
        const disponibilidadData = {
          fecha_cita: formData.fecha_cita,
          id_servicio: idServicio
        };

        const horariosDisponibles = await citaApiService.obtenerHorariosDisponibles(disponibilidadData);

        // Verificar si nuestra hora aún está disponible
        // (Excluir la hora actual de la cita si es la misma cita reagendándose)
        const currentHour24 = cita.hora_inicio;
        const isSameTimeSlot = currentHour24 === formData.hora_inicio;

        if (isSameTimeSlot || horariosDisponibles.includes(formData.hora_inicio)) {
          console.log("✅ Horario disponible para reagendar:", formData.hora_inicio);
        } else {
          console.error("❌ Horario ya no disponible:", formData.hora_inicio);
          setErrors({
            general: `El horario ${formData.hora_inicio} para el día ${formData.fecha_cita} ya fue ocupado. Por favor selecciona otro horario.`
          });
          return;
        }
      }

      // Si la validación pasa, continuar con la reagendar normal
      // Encontrar el agente del usuario actual o el primer agente disponible
      let idAgenteAsignado = cita.id_agente_asignado;

      if (user && user.id_persona) {
        // Si el usuario actual es un agente, usarlo
        const currentUserAsAgent = agents.find(agent => agent.id_persona === user.id_persona);
        if (currentUserAsAgent) {
          idAgenteAsignado = currentUserAsAgent.id_persona;
        } else if (!idAgenteAsignado && agents.length > 0) {
          // Si no hay agente asignado y hay agentes disponibles, usar el primero
          idAgenteAsignado = agents[0].id_persona;
        }
      }

      const rescheduleData = {
        ...formData,
        id_agente_asignado: idAgenteAsignado
      };

      const citaActualizada = await citaApiService.reagendarCita(cita.id, rescheduleData);

      onRescheduled(citaActualizada);
      onClose();

    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      setErrors({
        general: error.message || 'Error al reagendar la cita'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };

  if (!isOpen || !cita) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleRequestClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Reagendar Cita</h2>
              <p className="text-slate-600 text-sm">Cambiar fecha y hora</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRequestClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className={`p-6 space-y-4 ${isSubmitting ? 'pointer-events-none' : ''}`}
          >
            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva Fecha
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  name="fecha_cita"
                  value={formData.fecha_cita}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.fecha_cita ? 'border-red-300' : 'border-slate-300'}`}
                  min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.fecha_cita && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.fecha_cita}
                </p>
              )}
            </div>

            {/* Hora */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva Hora {currentAppointmentTime && `(Actual: ${currentAppointmentTime})`}
              </label>

              {/* Indicador de carga o lista de horarios */}
              {formData.fecha_cita && loadingTimes ? (
                <div className="flex items-center justify-center py-4 border border-slate-300 rounded-lg bg-slate-50">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-slate-600">Cargando horarios disponibles...</span>
                </div>
              ) : formData.fecha_cita && availableTimes.length > 0 ? (
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Selecciona el horario disponible:</span>
                  </div>

                  {/* Separar horarios por mañana y tarde */}
                  <div className="space-y-4">
                    {/* Mañana */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mañana</h4>
                      <div className="flex flex-wrap gap-2">
                        {availableTimes
                          .filter(time => {
                            const [h, m] = time.split(':').map(Number);

                            // Filtro de hoy (2 horas)
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                            if (formData.fecha_cita === todayStr) {
                              const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();
                              const appointmentTotalMinutes = h * 60 + m;
                              if ((appointmentTotalMinutes - currentTotalMinutes) < 120) return false;
                            }

                            return h <= 12;
                          })
                          .map(time => {
                            const isSelected = formData.hora_inicio === time;
                            // Convertir hora a formato 12 horas para mostrar
                            const [hours24, minutes] = time.split(':').map(Number);
                            const hours12 = hours24 === 0 ? 12 : (hours24 > 12 ? hours24 - 12 : hours24);
                            const period = hours24 >= 12 ? 'pm' : 'am';
                            const displayTime = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;

                            return (
                              <motion.button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, hora_inicio: time }));
                                  setSelectedTime(time);
                                  // Limpiar error
                                  if (errors.hora_inicio) {
                                    setErrors(prev => ({ ...prev, hora_inicio: undefined }));
                                  }
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
                                  ? 'bg-orange-600 text-white shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400 hover:bg-orange-50'
                                  }`}
                                disabled={isSubmitting}
                              >
                                {displayTime}
                              </motion.button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Tarde */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tarde</h4>
                      <div className="flex flex-wrap gap-2">
                        {availableTimes
                          .filter(time => {
                            const [h, m] = time.split(':').map(Number);

                            // Filtro de hoy (2 horas)
                            const today = new Date();
                            const todayStr = today.toISOString().split('T')[0];
                            if (formData.fecha_cita === todayStr) {
                              const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();
                              const appointmentTotalMinutes = h * 60 + m;
                              if ((appointmentTotalMinutes - currentTotalMinutes) < 120) return false;
                            }

                            return h >= 14 && h <= 16;
                          })
                          .map(time => {
                            const isSelected = formData.hora_inicio === time;
                            // Convertir hora a formato 12 horas para mostrar
                            const [hours24, minutes] = time.split(':').map(Number);
                            const hours12 = hours24 === 0 ? 12 : (hours24 > 12 ? hours24 - 12 : hours24);
                            const period = hours24 >= 12 ? 'pm' : 'am';
                            const displayTime = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;

                            return (
                              <motion.button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, hora_inicio: time }));
                                  setSelectedTime(time);
                                  // Limpiar error
                                  if (errors.hora_inicio) {
                                    setErrors(prev => ({ ...prev, hora_inicio: undefined }));
                                  }
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
                                  ? 'bg-orange-600 text-white shadow-md'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:border-orange-400 hover:bg-orange-50'
                                  }`}
                                disabled={isSubmitting}
                              >
                                {displayTime}
                              </motion.button>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Horario seleccionado */}
                  {formData.hora_inicio && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 font-medium">
                          Hora seleccionada: {
                            (() => {
                              const [hours24, minutes] = formData.hora_inicio.split(':').map(Number);
                              const hours12 = hours24 === 0 ? 12 : (hours24 > 12 ? hours24 - 12 : hours24);
                              const period = hours24 >= 12 ? 'pm' : 'am';
                              return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
                            })()
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : formData.fecha_cita ? (
                <div className="flex items-center justify-center py-8 border border-slate-300 rounded-lg bg-slate-50">
                  <div className="text-center text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">Selecciona una fecha primero para ver los horarios disponibles</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 border border-slate-300 rounded-lg bg-slate-50">
                  <div className="text-center text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">Selecciona una fecha para ver los horarios disponibles</p>
                  </div>
                </div>
              )}

              {errors.hora_inicio && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.hora_inicio}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Motivo del reagendamiento
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea
                  name="motivo_reagendamiento"
                  value={formData.motivo_reagendamiento}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Ej: El cliente solicitó cambiar la hora por compromiso laboral..."
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.motivo_reagendamiento ? 'border-red-300' : 'border-slate-300'}`}
                />
              </div>
              <div className="flex justify-between">
                {errors.motivo_reagendamiento && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.motivo_reagendamiento}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-500 ml-auto">
                  {formData.motivo_reagendamiento.length}/500
                </p>
              </div>
            </div>

            {/* Error general */}
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRequestClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Cancelar
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Reagendando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Reagendar
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default RescheduleAppointmentModal;
