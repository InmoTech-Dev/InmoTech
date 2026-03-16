const WORKING_DAYS = [1, 2, 3, 4, 5];
const WORKING_DAY_LABEL = "Lunes a viernes";
const WORKING_BLOCKS = [
  { start: "08:00", end: "13:00" },
  { start: "14:00", end: "17:00" },
];
const APPOINTMENT_INTERVAL_MINUTES = 30;
const APPOINTMENT_DURATION_MINUTES = 30;
const DEFAULT_APPOINTMENT_LEAD_MINUTES = 120;

const pad = (value) => String(value).padStart(2, "0");

const normalizeDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeTime = (timeValue) => {
  if (!timeValue) return null;
  const text = String(timeValue).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return `${pad(hours)}:${pad(minutes)}`;
};

const timeToMinutes = (timeValue) => {
  const normalized = normalizeTime(timeValue);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(":").map(Number);
  return (hours * 60) + minutes;
};

const minutesToTime = (minutes) => {
  const safeMinutes = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${pad(hours)}:${pad(mins)}`;
};

const VALID_START_TIMES = WORKING_BLOCKS.flatMap((block) => {
  const startMinutes = timeToMinutes(block.start);
  const endMinutes = timeToMinutes(block.end);
  const slots = [];

  for (
    let current = startMinutes;
    current + APPOINTMENT_DURATION_MINUTES <= endMinutes;
    current += APPOINTMENT_INTERVAL_MINUTES
  ) {
    slots.push(minutesToTime(current));
  }

  return slots;
});

const isBusinessDay = (dateOrDayNumber) => {
  if (typeof dateOrDayNumber === "number") {
    return WORKING_DAYS.includes(dateOrDayNumber);
  }

  const date = normalizeDateInput(dateOrDayNumber);
  if (!date) return false;
  return WORKING_DAYS.includes(date.getDay());
};

const isValidAppointmentStart = (timeHHmm) => {
  const normalized = normalizeTime(timeHHmm);
  return Boolean(normalized && VALID_START_TIMES.includes(normalized));
};

const calculateEndTime = (startHHmm) => {
  const startMinutes = timeToMinutes(startHHmm);
  if (startMinutes === null) return null;
  return minutesToTime(startMinutes + APPOINTMENT_DURATION_MINUTES);
};

const buildDailySlots = () =>
  VALID_START_TIMES.map((start) => ({
    hora_inicio: start,
    hora_fin: calculateEndTime(start),
  }));

const getBusinessHoursLines = () => [
  `${WORKING_DAY_LABEL}: 8:00 am - 12:30 pm (última cita a las 12:30)`,
  "2:00 pm - 4:30 pm (última cita a las 4:30)",
];

const getBusinessHoursMessage = () => getBusinessHoursLines().join(" ");

const isWithinBusinessSchedule = ({ fecha, horaInicio, horaFin }) => {
  if (!isBusinessDay(fecha)) {
    return false;
  }

  const normalizedStart = normalizeTime(horaInicio);
  if (!normalizedStart || !VALID_START_TIMES.includes(normalizedStart)) {
    return false;
  }

  const expectedEnd = calculateEndTime(normalizedStart);
  const normalizedEnd = normalizeTime(horaFin || expectedEnd);
  return Boolean(expectedEnd && normalizedEnd === expectedEnd);
};

const filterTodaySlotsByLeadTime = (
  slots,
  now = new Date(),
  leadMinutes = DEFAULT_APPOINTMENT_LEAD_MINUTES
) => {
  if (!Array.isArray(slots)) return [];
  const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
  return slots.filter((slot) => {
    const timeValue = typeof slot === "string" ? slot : slot?.hora_inicio;
    const startMinutes = timeToMinutes(timeValue);
    return startMinutes !== null && (startMinutes - currentTotalMinutes) >= leadMinutes;
  });
};

module.exports = {
  WORKING_DAYS,
  WORKING_DAY_LABEL,
  WORKING_BLOCKS,
  APPOINTMENT_INTERVAL_MINUTES,
  APPOINTMENT_DURATION_MINUTES,
  DEFAULT_APPOINTMENT_LEAD_MINUTES,
  VALID_START_TIMES,
  normalizeTime,
  timeToMinutes,
  minutesToTime,
  isBusinessDay,
  isValidAppointmentStart,
  calculateEndTime,
  buildDailySlots,
  getBusinessHoursLines,
  getBusinessHoursMessage,
  isWithinBusinessSchedule,
  filterTodaySlotsByLeadTime,
};
