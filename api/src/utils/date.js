/**
 * Utilidades para manejo de fechas y horas compatibles con SQL Server
 */
const {
  APPOINTMENT_DURATION_MINUTES,
  calculateEndTime,
  isWithinBusinessSchedule,
  normalizeTime,
} = require("../constants/appointmentSchedule");

/**
 * Normaliza una fecha al formato YYYY-MM-DD
 * @param {string|Date} fecha 
 * @returns {string|null}
 */
const normalizarFechaCita = (fecha) => {
  if (!fecha) return null;
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
};

/**
 * Normaliza una hora al formato HH:mm:ss
 * @param {string} hora 
 * @returns {string|null}
 */
const normalizarHoraExacta = (hora) => {
  if (!hora) return null;
  
  // Si es un objeto Date (Sequelize TIME)
  if (hora instanceof Date) {
    const h = String(hora.getHours()).padStart(2, '0');
    const m = String(hora.getMinutes()).padStart(2, '0');
    const s = String(hora.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  const t = String(hora).trim();
  // Formato HH:mm o HH:mm:ss o ISO con T
  if (t.includes('T')) {
    try {
      const d = new Date(t);
      if (!isNaN(d.getTime())) {
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
      }
    } catch (e) {}
  }

  const match = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const h = match[1].padStart(2, '0');
  const m = match[2].padStart(2, '0');
  const s = (match[3] || '00').padStart(2, '0');

  return `${h}:${m}:${s}`;
};

/**
 * Alias para normalizarHoraExacta para mantener compatibilidad
 */
const normalizarHoraTexto = (hora) => {
  return normalizarHoraExacta(hora);
};

/**
 * Convierte HH:mm:ss o HH:mm a minutos totales desde las 00:00
 */
const horaEnMinutos = (hora) => {
  if (!hora) return 0;
  
  let h, m;
  
  if (typeof hora === 'string') {
    const parts = hora.split(':');
    h = Number(parts[0]) || 0;
    m = Number(parts[1]) || 0;
  } else if (hora instanceof Date) {
    // Si es un objeto Date (Sequelize a veces devuelve TIME como Date)
    h = hora.getHours();
    m = hora.getMinutes();
  } else {
    // Intentar convertir a string y procesar
    const t = String(hora).trim();
    const parts = t.split(':');
    if (parts.length < 2) return 0;
    h = Number(parts[0]) || 0;
    m = Number(parts[1]) || 0;
  }
  
  return h * 60 + m;
};

/**
 * Suma minutos a una hora y retorna HH:mm:ss
 */
const sumarMinutosHora = (hora, minutos) => {
  if (!hora) return null;
  const total = horaEnMinutos(hora) + minutos;
  // Asegurarnos de que el total no sea negativo (ej: 00:00 - 1 min)
  const totalPositivo = total < 0 ? (24 * 60) + total : total;
  const h = Math.floor(totalPositivo / 60) % 24;
  const m = totalPositivo % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

/**
 * Resuelve el rango horario asegurando formato HH:mm:ss
 */
const resolverRangoHorario = ({ horaInicio, horaFin, duracion = 60 }) => {
  const hInicio = normalizarHoraExacta(horaInicio);
  if (!hInicio) return { horaInicio: null, horaFin: null };

  let hFin = normalizarHoraExacta(horaFin);
  if (!hFin) {
    const horaFinCalculada =
      duracion === APPOINTMENT_DURATION_MINUTES
        ? calculateEndTime(hInicio)
        : normalizeTime(sumarMinutosHora(hInicio, duracion));
    hFin = horaFinCalculada ? `${horaFinCalculada}:00` : null;
  }

  return { horaInicio: hInicio, horaFin: hFin };
};

const cumpleHorarioLaboral = ({ fecha, horaInicio, horaFin }) =>
  isWithinBusinessSchedule({
    fecha,
    horaInicio: normalizarHoraTexto(horaInicio),
    horaFin: normalizarHoraTexto(horaFin),
  });

module.exports = {
  normalizarFechaCita,
  normalizarHoraExacta,
  normalizarHoraTexto,
  horaEnMinutos,
  sumarMinutosHora,
  resolverRangoHorario,
  cumpleHorarioLaboral,
};
