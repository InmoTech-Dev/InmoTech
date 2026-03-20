// 📌 phoneFormatter.js
// Función para formatear teléfonos colombianos con soporte de borrado libre
export const formatPhoneNumber = (currentValue, previousValue = '', isDeleting = false) => {
  if (!currentValue) return '';

  // ✅ Si está borrando, permitir que quite espacios y números sin trabas
  if (isDeleting || currentValue.length < previousValue.length) {
    if (currentValue === '+57 ' || currentValue === '+57') {
      return '';
    }
    return currentValue;
  }

  // 🔹 Limpiar caracteres no numéricos excepto +
  let cleaned = currentValue.replace(/[^\d+]/g, '');

  // 🔹 Asegurar prefijo +57
  if (!cleaned.startsWith('+57')) {
    if (cleaned.startsWith('57')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      cleaned = '+57' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+57' + cleaned;
    }
  }

  // 🔹 Limitar longitud máxima (+57 + 10 dígitos)
  if (cleaned.length > 14) {
    cleaned = cleaned.substring(0, 14);
  }

  // 🔹 Aplicar formato progresivo
  if (cleaned.length >= 13) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9, 13)}`;
  } else if (cleaned.length >= 10) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
  } else if (cleaned.length >= 7) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  } else if (cleaned.length >= 4) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3)}`;
  }

  return cleaned;
};
