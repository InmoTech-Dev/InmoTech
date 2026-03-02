const COLOMBIA_OFFSET_MINUTES = 5 * 60;
const MINUTES_PER_DAY = 24 * 60;

const pad = (value) => String(value).padStart(2, '0');

const normalizeTimeInput = (timeString) => {
  if (!timeString || typeof timeString !== 'string') {
    return null;
  }

  const trimmed = timeString.trim();
  if (!trimmed) {
    return null;
  }

  // Manejar formatos ISO o strings de fecha genéricos (ej. Thu Jan 01 1970...)
  if (trimmed.includes('T') || trimmed.includes('GMT') || /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    // Usar la hora local del objeto Date si no tiene 'Z' (asumimos que ya viene en hora local o es representativo)
    // Si tiene 'T' y 'Z', es UTC puro. Si es un toString() de JS, tiene la zona horaria.
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return {
      hours24: hours,
      minutes: minutes
    };
  }

  // Manejar formato con am/pm (ej. 08:30 pm)
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const meridiem = ampmMatch[3].toLowerCase();

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    }
    if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return { hours24: hours, minutes };
  }

  // Manejar formato 24h (ej. 13:00 o 13:00:00)
  const simpleMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (simpleMatch) {
    const hours = parseInt(simpleMatch[1], 10);
    const minutes = parseInt(simpleMatch[2], 10);

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

    return { hours24: hours, minutes };
  }

  return null;
};

export const formatTimeTo12Hour = (timeString) => {
  const normalized = normalizeTimeInput(timeString);
  if (!normalized) {
    return null;
  }

  const { hours24, minutes } = normalized;
  const isPM = hours24 >= 12;
  const hours12 = hours24 === 0 ? 12 : (hours24 > 12 ? hours24 - 12 : hours24);

  return `${pad(hours12)}:${pad(minutes)} ${isPM ? 'pm' : 'am'}`;
};

export const formatTimeTo24Hour = (timeString) => {
  const normalized = normalizeTimeInput(timeString);
  if (!normalized) {
    return null;
  }

  return `${pad(normalized.hours24)}:${pad(normalized.minutes)}`;
};
