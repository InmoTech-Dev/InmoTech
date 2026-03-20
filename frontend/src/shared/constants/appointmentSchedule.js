import { formatTimeTo12Hour, formatTimeTo24Hour } from "../utils/time";

export const WORKING_DAYS = [1, 2, 3, 4, 5];
export const WORKING_DAY_LABEL = "Lunes a viernes";
export const WORKING_BLOCKS = [
  { start: "08:00", end: "13:00" },
  { start: "14:00", end: "17:00" },
];
export const APPOINTMENT_INTERVAL_MINUTES = 30;
export const APPOINTMENT_DURATION_MINUTES = 30;
export const DEFAULT_APPOINTMENT_LEAD_MINUTES = 120;

const pad = (value) => String(value).padStart(2, "0");

const normalizeDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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

export const timeToMinutes = (timeValue) => {
  const normalized = formatTimeTo24Hour(String(timeValue || ""));
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  return (hours * 60) + minutes;
};

export const minutesToTime = (minutes) => {
  const safeMinutes = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${pad(hours)}:${pad(mins)}`;
};

export const VALID_START_TIMES = WORKING_BLOCKS.flatMap((block) => {
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

export const isBusinessDay = (dateOrDayNumber) => {
  if (typeof dateOrDayNumber === "number") {
    return WORKING_DAYS.includes(dateOrDayNumber);
  }

  const date = normalizeDateInput(dateOrDayNumber);
  if (!date) return false;
  return WORKING_DAYS.includes(date.getDay());
};

export const isValidAppointmentStart = (timeHHmm) => {
  const normalized = formatTimeTo24Hour(String(timeHHmm || ""));
  return Boolean(normalized && VALID_START_TIMES.includes(normalized));
};

export const calculateEndTime = (startHHmm) => {
  const startMinutes = timeToMinutes(startHHmm);
  if (startMinutes === null) return null;
  return minutesToTime(startMinutes + APPOINTMENT_DURATION_MINUTES);
};

export const buildDailySlots = () =>
  VALID_START_TIMES.map((start) => ({
    hora_inicio: start,
    hora_fin: calculateEndTime(start),
  }));

export const getBusinessHoursLines = () => [
  `${WORKING_DAY_LABEL}: 8:00 am - 12:30 pm (última cita a las 12:30)`,
  "2:00 pm - 4:30 pm (última cita a las 4:30)",
];

export const getBusinessHoursMessage = () => getBusinessHoursLines().join(" ");

export const isWithinBusinessSchedule = ({ fecha, horaInicio, horaFin }) => {
  if (!isBusinessDay(fecha)) {
    return false;
  }

  const normalizedStart = formatTimeTo24Hour(String(horaInicio || ""));
  if (!normalizedStart || !VALID_START_TIMES.includes(normalizedStart)) {
    return false;
  }

  const expectedEnd = calculateEndTime(normalizedStart);
  if (!expectedEnd) {
    return false;
  }

  const normalizedEnd = formatTimeTo24Hour(String(horaFin || expectedEnd));
  return normalizedEnd === expectedEnd;
};

export const filterTodaySlotsByLeadTime = (
  slots,
  now = new Date(),
  leadMinutes = DEFAULT_APPOINTMENT_LEAD_MINUTES
) => {
  if (!Array.isArray(slots)) return [];

  const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
  return slots.filter((slot) => {
    const startValue = typeof slot === "string" ? slot : slot?.hora_inicio;
    const startMinutes = timeToMinutes(startValue);
    return startMinutes !== null && (startMinutes - currentTotalMinutes) >= leadMinutes;
  });
};

export const formatScheduleTimeLabel = (timeValue) =>
  formatTimeTo12Hour(timeValue)?.toLowerCase() || timeValue;
