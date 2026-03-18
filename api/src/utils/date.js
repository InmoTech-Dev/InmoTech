/**
 * Utilidades para manejo de fechas y horas compatibles con SQL Server
 */

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
  const t = String(hora).trim();
  // Formato HH:mm o HH:mm:ss
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
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Suma minutos a una hora y retorna HH:mm:ss
 */
const sumarMinutosHora = (hora, minutos) => {
  if (!hora) return null;
  const total = horaEnMinutos(hora) + minutos;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
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
    hFin = sumarMinutosHora(hInicio, duracion);
  }

  return { horaInicio: hInicio, horaFin: hFin };
};

module.exports = {
  normalizarFechaCita,
  normalizarHoraExacta,
  normalizarHoraTexto,
  horaEnMinutos,
  sumarMinutosHora,
  resolverRangoHorario
};
