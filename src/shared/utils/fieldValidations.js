// Validaciones reutilizables para campos de formularios (citas, perfil, etc.)

export const validateNombres = (nombres = "") => {
  const value = nombres.trim();
  if (!value) return "Los nombres son requeridos";
  if (value.length < 2) return "Los nombres deben tener al menos 2 caracteres";
  if (value.length > 50) return "Los nombres no pueden tener más de 50 caracteres";
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(value)) {
    return "Los nombres solo pueden contener letras y espacios";
  }
  return "";
};

export const validateApellidos = (apellidos = "") => {
  const value = apellidos.trim();
  if (!value) return "Los apellidos son requeridos";
  if (value.length < 2) return "Los apellidos deben tener al menos 2 caracteres";
  if (value.length > 50) return "Los apellidos no pueden tener más de 50 caracteres";
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(value)) {
    return "Los apellidos solo pueden contener letras y espacios";
  }
  return "";
};

export const validateTelefono = (telefono = "") => {
  const value = telefono.trim();
  if (!value) return "El teléfono es requerido";
  const telefonoLimpio = value.replace(/[\s\-\(\)]/g, "");
  if (!/^(\+57|57)?3[0-9]{9}$/.test(telefonoLimpio)) {
    return "El teléfono debe tener formato colombiano (+57 XXX XXX XXXX o 3XX XXX XXXX)";
  }
  return "";
};

export const validateEmail = (email = "") => {
  const value = email.trim();
  if (!value) return "El email es requerido";
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(value)) return "Ingresa un email válido";
  if (value.length > 254) return "El email es demasiado largo";
  return "";
};

export const validateTipoDocumento = (tipoDocumento = "") => {
  if (!tipoDocumento) return "El tipo de documento es requerido";
  return "";
};

export const validateNumeroDocumento = (numeroDocumento = "", tipoDocumento = "") => {
  const value = numeroDocumento.trim();
  if (!value) return "El número de documento es requerido";

  const numeroLimpio = value.replace(/[\s\-\.]/g, "");

  switch (tipoDocumento) {
    case "Cédula de Ciudadanía":
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
        return "La cédula debe tener entre 8 y 10 dígitos";
      }
      break;
    case "Cédula de Extranjería":
      if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
        return "La cédula de extranjería debe tener entre 6 y 10 dígitos";
      }
      break;
    case "NIT":
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
        return "El NIT debe tener entre 8 y 10 dígitos";
      }
      break;
    case "Pasaporte":
      if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
        return "El pasaporte debe tener entre 6 y 20 caracteres";
      }
      if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
        return "El pasaporte solo puede contener letras y números";
      }
      break;
    case "Tarjeta de Identidad":
      if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
        return "La tarjeta de identidad debe tener 10 u 11 dígitos";
      }
      break;
    default:
      return "Tipo de documento no válido";
  }

  return "";
};

export const profileValidations = {
  validateNombres,
  validateApellidos,
  validateTelefono,
  validateEmail,
  validateTipoDocumento,
  validateNumeroDocumento,
};

export default profileValidations;
