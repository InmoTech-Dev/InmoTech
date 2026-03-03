import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import citaApiService from '../../../../../shared/services/citaApiService';
import { formatTimeTo12Hour } from '../../../../../shared/utils/time';

const DateTimeStep = ({ formData, errors, updateFormData, onFieldComplete }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formData.fecha);
  const [isPreselected, setIsPreselected] = useState(!!formData.fecha);
  const [availableHours, setAvailableHours] = useState([]);
  const [loadingHours, setLoadingHours] = useState(false);

  // Refs para los campos
  const calendarRef = useRef(null);
  const timeSelectionRef = useRef(null);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      days.push({
        date,
        isCurrentMonth: true,
        isDisabled: date < today,
        isToday: date.toDateString() === today.toDateString()
      });
    }

    // Días del mes siguiente para completar la grilla
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    return days;
  };

  const formatDateForInput = (date) => {
    // Usar formato local YYYY-MM-DD sin conversión UTC para evitar cambios de día por zona horaria
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';

    // Solución: mostrar la fecha tal como viene del input sin usar Date objects
    const [year, month, day] = dateString.split('-');

    // Crear arrays para los nombres de meses y días
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const weekdays = [
      'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
    ];

    // Calcular el día de la semana usando un algoritmo simple
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    // Algoritmo de Zeller simplificado para calcular el día de la semana
    const monthAdjusted = monthNum < 3 ? monthNum + 12 : monthNum;
    const yearAdjusted = monthNum < 3 ? yearNum - 1 : yearNum;

    const weekdayIndex = (dayNum + Math.floor(2.6 * ((monthAdjusted + 1) % 12) - 0.2) +
      yearAdjusted % 100 + Math.floor(yearAdjusted % 100 / 4) +
      Math.floor(yearAdjusted / 400) - 2 * Math.floor(yearAdjusted / 100)) % 7;

    const weekday = weekdays[Math.abs(weekdayIndex) % 7];
    const monthName = months[parseInt(month) - 1];

    return `${weekday}, ${day} de ${monthName} de ${year}`;
  };

  // Función para cargar horarios disponibles
  const loadAvailableHours = async (fecha, servicio = null) => {
    if (!fecha) return;

    setLoadingHours(true);
    try {
      let hoursToShow = [];
      // Si hay servicio seleccionado, usar la lógica de bloqueo
      // Caso contrario, usar horarios predeterminados
      if (servicio) {
        console.log('Loading restricted hours for service:', servicio);

        // Mapear el nombre del servicio al ID
        const SERVICIO_MAP = {
          "Visita a Propiedad": 1,
          "Avalúos": 2,
          "Gestión de Alquileres": 3,
          "Asesoría Legal": 4,
        };

        const idServicio = SERVICIO_MAP[servicio] || 1;

        const data = {
          fecha_cita: fecha,
          id_servicio: idServicio
        };

        hoursToShow = await citaApiService.obtenerHorariosDisponibles(data);
      } else {
        // Sin servicio seleccionado: horarios predeterminados
        console.log('Loading default hours (no service restriction)');
        const defaultHours = [];
        for (let hora = 8; hora <= 16; hora++) {
          if (hora === 13) continue;
          defaultHours.push(`${hora.toString().padStart(2, '0')}:00`);
          defaultHours.push(`${hora.toString().padStart(2, '0')}:30`);
        }
        hoursToShow = defaultHours;
      }

      // Filtrar horarios si es hoy (margen de 2 horas)
      const today = new Date();
      const isToday = fecha === formatDateForInput(today);

      if (isToday) {
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();

        hoursToShow = hoursToShow.filter(time => {
          const [h, m] = time.split(':').map(Number);
          // Convertir ambas a minutos desde inicio del día para comparar
          const currentTotalMinutes = currentHour * 60 + currentMinute;
          const appointmentTotalMinutes = h * 60 + m;
          // Debe haber al menos 120 minutos (2 horas) de diferencia
          return (appointmentTotalMinutes - currentTotalMinutes) >= 120;
        });
      }

      setAvailableHours(hoursToShow);
    } catch (error) {
      console.error('Error loading available hours:', error);
      // Fallback: horarios predeterminados filtrados si es hoy
      const defaultHours = [];
      for (let hora = 8; hora <= 16; hora++) {
        if (hora === 13) continue;
        defaultHours.push(`${hora.toString().padStart(2, '0')}:00`);
        defaultHours.push(`${hora.toString().padStart(2, '0')}:30`);
      }

      let filteredFallback = defaultHours;
      const today = new Date();
      if (fecha === formatDateForInput(today)) {
        const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();
        filteredFallback = defaultHours.filter(time => {
          const [h, m] = time.split(':').map(Number);
          return (h * 60 + m - currentTotalMinutes) >= 120;
        });
      }
      setAvailableHours(filteredFallback);
    } finally {
      setLoadingHours(false);
    }
  };

  const handleDateSelect = (day) => {
    if (day.isDisabled) return;

    const dateString = formatDateForInput(day.date);
    setSelectedDate(dateString);
    updateFormData('fecha', dateString);

    // Cargar horarios para esta fecha
    loadAvailableHours(dateString, formData.servicio);
  };

  const handleHourSelect = (hour) => {
    updateFormData('hora', hour);
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentMonth);

  // Scroll automático a la sección de horas cuando se selecciona una fecha
  useEffect(() => {
    if (selectedDate && timeSelectionRef.current) {
      timeSelectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedDate]);

  // Recargar horarios cuando cambia el servicio (si ya hay fecha seleccionada)
  useEffect(() => {
    if (selectedDate && formData.servicio) {
      loadAvailableHours(selectedDate, formData.servicio);
    }
  }, [formData.servicio]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Fecha y Hora</h3>
        <p className="text-slate-600">Selecciona cuándo será la cita</p>
      </div>

      {/* Calendar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        {/* Preselected Date Info */}
        {isPreselected && selectedDate && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Fecha pre-seleccionada:</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              {formatDateForDisplay(selectedDate)}
            </p>
          </div>
        )}

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </motion.button>

          <h4 className="text-lg font-semibold text-slate-800">
            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </motion.button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isSelected = selectedDate === formatDateForInput(day.date);

            return (
              <motion.button
                key={index}
                whileHover={!day.isDisabled ? { scale: 1.05 } : {}}
                whileTap={!day.isDisabled ? { scale: 0.95 } : {}}
                onClick={() => handleDateSelect(day)}
                disabled={day.isDisabled}
                className={`
                  h-10 w-10 rounded-lg text-sm font-medium transition-all duration-200
                  ${day.isDisabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-blue-50'
                  }
                  ${!day.isCurrentMonth ? 'text-slate-400' : ''}
                  ${day.isToday ? 'bg-blue-100 text-blue-600 font-bold' : ''}
                  ${isSelected ? 'bg-blue-600 text-white' : ''}
                `}
              >
                {day.date.getDate()}
              </motion.button>
            );
          })}
        </div>

        {errors.fecha && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm mt-2"
          >
            {errors.fecha}
          </motion.p>
        )}
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <motion.div
          ref={timeSelectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-5 h-5" />
            <h4 className="font-medium">Seleccionar Hora</h4>
            {formData.servicio && (
              <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                Servicio: {formData.servicio}
              </span>
            )}
          </div>

          {loadingHours ? (
            <div className="flex items-center justify-center py-8 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Cargando horarios disponibles...</span>
              </div>
            </div>
          ) : availableHours.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {availableHours.map(hour => (
                <motion.button
                  key={hour}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleHourSelect(hour)}
                  className={`
                    py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${formData.hora === hour
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
                    }
                  `}
                >
                  {formatTimeTo12Hour(hour)}
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-center text-yellow-700">
                <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm font-medium">No hay horarios disponibles</p>
                <p className="text-xs">Selecciona otra fecha o servicio</p>
              </div>
            </div>
          )}

          {errors.hora && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm"
            >
              {errors.hora}
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Selected Date and Time Display */}
      {formData.fecha && formData.hora && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 text-green-800">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Cita programada para:</span>
          </div>
          <p className="text-green-700 mt-1 font-semibold">
            {formatDateForDisplay(formData.fecha)} a las {formData.hora}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DateTimeStep;