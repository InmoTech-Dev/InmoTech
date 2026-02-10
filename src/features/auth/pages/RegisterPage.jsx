import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Sparkles,
  Trophy,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/hooks/use-toast";
import usersApiService from "../../../shared/services/usersApiService";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { Checkbox } from "../../../shared/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../shared/components/ui/select";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/;

const mapTipoDocumento = (tipo) => (tipo === "PASAPORTE" ? "PAS" : tipo);

const validateTipoDocumento = (tipo) => {
  if (!tipo) return "El tipo de documento es obligatorio";
  const tiposValidos = ["CC", "CE", "NIT", "PASAPORTE", "TI"];
  if (!tiposValidos.includes(tipo)) return "Tipo de documento invalido";
  return "";
};

const validateNumeroDocumento = (numero, tipo) => {
  if (!numero || !numero.trim()) return "El numero de documento es obligatorio";
  const numeroLimpio = numero.replace(/[\s\-.]/g, "");

  switch (tipo) {
    case "CC":
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
        return "La cedula debe tener entre 8 y 10 digitos";
      }
      break;
    case "CE":
      if (!/^[0-9]{6,10}$/.test(numeroLimpio)) {
        return "La cedula de extranjeria debe tener entre 6 y 10 digitos";
      }
      break;
    case "NIT":
      if (!/^[0-9]{8,10}$/.test(numeroLimpio)) {
        return "El NIT debe tener entre 8 y 10 digitos";
      }
      break;
    case "PASAPORTE":
      if (numeroLimpio.length < 6 || numeroLimpio.length > 20) {
        return "El pasaporte debe tener entre 6 y 20 caracteres";
      }
      if (!/^[A-Za-z0-9]+$/.test(numeroLimpio)) {
        return "El pasaporte solo puede contener letras y numeros";
      }
      break;
    case "TI":
      if (!/^[0-9]{10,11}$/.test(numeroLimpio)) {
        return "La tarjeta de identidad debe tener 10 u 11 digitos";
      }
      break;
    default:
      return "Primero selecciona un tipo de documento";
  }
  return "";
};

const validateNombreCompleto = (nombre) => {
  if (!nombre || !nombre.trim()) return "El nombre completo es obligatorio";
  const nombreTrim = nombre.trim();
  if (nombreTrim.length < 2) return "El nombre debe tener al menos 2 caracteres";
  if (nombreTrim.length > 50) return "El nombre no puede tener mas de 50 caracteres";
  if (!/^[a-zA-Z\s]+$/.test(nombreTrim)) {
    return "El nombre solo puede contener letras y espacios";
  }
  return "";
};

const validateApellidoCompleto = (apellido) => {
  if (!apellido || !apellido.trim()) return "El apellido completo es obligatorio";
  const apellidoTrim = apellido.trim();
  if (apellidoTrim.length < 2) return "El apellido debe tener al menos 2 caracteres";
  if (apellidoTrim.length > 50) return "El apellido no puede tener mas de 50 caracteres";
  if (!/^[a-zA-Z\s]+$/.test(apellidoTrim)) {
    return "El apellido solo puede contener letras y espacios";
  }
  return "";
};

const validateEmail = (email) => {
  if (!email || !email.trim()) return "El correo electronico es obligatorio";
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) return "Ingresa un correo electronico valido";
  if (email.length > 254) return "El correo electronico es demasiado largo";
  return "";
};

const validateTelefono = (telefono) => {
  if (!telefono || !telefono.trim()) return "El telefono es obligatorio";
  const telefonoLimpio = telefono.replace(/[\s\-()]/g, "");
  if (!/(?:\+57|57)?3\d{9}$/.test(telefonoLimpio)) {
    return "El telefono debe seguir el formato colombiano";
  }
  const digitosNumericos = telefonoLimpio.replace(/\D/g, "");
  if (telefonoLimpio.startsWith("+57") && digitosNumericos.length !== 12) {
    return "Con prefijo +57 debe incluir 12 digitos";
  }
  if (telefonoLimpio.startsWith("57") && !telefonoLimpio.startsWith("+57") && digitosNumericos.length !== 11) {
    return "Con prefijo 57 debe incluir 11 digitos";
  }
  if (!telefonoLimpio.startsWith("57") && !telefonoLimpio.startsWith("+57") && digitosNumericos.length !== 10) {
    return "Debe tener exactamente 10 digitos";
  }
  return "";
};

const validatePassword = (password) => {
  if (!password || !password.trim()) return "La contrasena es obligatoria";
  if (password.length < 8) return "La contrasena debe tener al menos 8 caracteres";
  if (password.length > 100) return "La contrasena no puede exceder 100 caracteres";
  if (!PASSWORD_REGEX.test(password)) {
    return "Incluye minuscula, mayuscula, numero y simbolo";
  }
  return "";
};

const validateConfirmPassword = (confirmPassword, password) => {
  if (!confirmPassword || !confirmPassword.trim()) return "Confirma tu contrasena";
  if (confirmPassword !== password) return "Las contrasenas no coinciden";
  return "";
};
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const emailTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    tipo_documento: "CC",
    numero_documento: "",
    nombre_completo: "",
    apellido_completo: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    terminos: false,
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const validateAllFields = () => ({
    tipo_documento: validateTipoDocumento(formData.tipo_documento),
    numero_documento: validateNumeroDocumento(formData.numero_documento, formData.tipo_documento),
    nombre_completo: validateNombreCompleto(formData.nombre_completo),
    apellido_completo: validateApellidoCompleto(formData.apellido_completo),
    email: validateEmail(formData.email),
    telefono: validateTelefono(formData.telefono),
    password: validatePassword(formData.password),
    confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.password),
  });

  const checkEmailAvailability = useCallback(async (email) => {
    if (!email || validateEmail(email)) {
      setEmailAvailable(null);
      return;
    }

    try {
      setCheckingEmail(true);
      const response = await usersApiService.verificarCorreoExistente(email);
      setEmailAvailable(!response?.data?.existe);
    } catch (err) {
      console.warn("No se pudo validar el correo", err);
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  const validateField = (fieldName, value = null) => {
    const val = value !== null ? value : formData[fieldName];
    let errorMessage = "";

    switch (fieldName) {
      case "tipo_documento":
        errorMessage = validateTipoDocumento(val);
        break;
      case "numero_documento":
        errorMessage = validateNumeroDocumento(val, formData.tipo_documento);
        break;
      case "nombre_completo":
        errorMessage = validateNombreCompleto(val);
        break;
      case "apellido_completo":
        errorMessage = validateApellidoCompleto(val);
        break;
      case "email":
        errorMessage = validateEmail(val);
        break;
      case "telefono":
        errorMessage = validateTelefono(val);
        break;
      case "password":
        errorMessage = validatePassword(val);
        break;
      case "confirmPassword":
        errorMessage = validateConfirmPassword(val, formData.password);
        break;
      default:
        errorMessage = "";
    }

    setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
    return errorMessage;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const baseValue = type === "checkbox" ? checked : value;
    let nextValue = baseValue;

    if (name === "numero_documento") {
      nextValue = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }

    if (name === "telefono") {
      nextValue = value.replace(/[^\d+\-\s]/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    if (name === "password") {
      setPasswordStrength({
        length: nextValue.length >= 8,
        uppercase: /[A-Z]/.test(nextValue),
        lowercase: /[a-z]/.test(nextValue),
        number: /[0-9]/.test(nextValue),
        special: /[^A-Za-z0-9]/.test(nextValue),
      });
      validateField("password", nextValue);
      if (formData.confirmPassword) {
        validateField("confirmPassword", formData.confirmPassword);
      }
    }

    if (name === "confirmPassword") {
      validateField("confirmPassword", nextValue);
    }

    if (name === "email") {
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
      setEmailAvailable(null);

      if (nextValue && nextValue.trim()) {
        emailTimeoutRef.current = setTimeout(() => {
          const emailError = validateEmail(nextValue);
          if (!emailError) {
            checkEmailAvailability(nextValue.trim().toLowerCase());
          } else {
            setEmailAvailable(null);
          }
        }, 500);
      }
      validateField("email", nextValue);
    }

    if (name === "telefono") {
      validateField("telefono", nextValue);
    }

    if (name === "numero_documento" && formData.tipo_documento) {
      if (nextValue.length >= 5) {
        validateField("numero_documento", nextValue);
      }
    }
  };

  const handleSelectChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    validateField(fieldName, value);

    if (fieldName === "tipo_documento" && formData.numero_documento) {
      validateField("numero_documento", formData.numero_documento);
    }
  };

  const handleBlur = (fieldName) => {
    validateField(fieldName);
  };

  const getPasswordStrengthScore = () => Object.values(passwordStrength).filter(Boolean).length;

  const getPasswordStrengthColor = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return "bg-red-500";
    if (score <= 3) return "bg-yellow-500";
    if (score <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    const score = getPasswordStrengthScore();
    if (score <= 2) return "Debil";
    if (score <= 3) return "Regular";
    if (score <= 4) return "Buena";
    return "Excelente";
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateAllFields();
    const hasErrors = Object.values(validationErrors).some((msg) => msg);
    if (hasErrors) {
      setFieldErrors(validationErrors);
      const firstError = Object.values(validationErrors).find((msg) => msg) || "Corrige los campos senalados";
      setError(firstError);
      toast({ title: "Revisa los datos", description: firstError, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const userData = {
        tipo_documento: mapTipoDocumento(formData.tipo_documento),
        numero_documento: formData.numero_documento.trim().toUpperCase(),
        nombre_completo: formData.nombre_completo.trim(),
        apellido_completo: formData.apellido_completo.trim(),
        email: formData.email.trim().toLowerCase(),
        telefono: formData.telefono.replace(/[^\d+\-\s]/g, "").trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      await register(userData);

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente.",
        variant: "success",
      });
      navigate("/");
    } catch (err) {
      const errorMessage = err?.message || "Error al crear la cuenta. Intentalo de nuevo.";
      setError(errorMessage);
      toast({ title: "Error en el registro", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#00457B] via-[#0056A3] to-[#0066CC] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white mx-auto">
          <div className="max-w-md text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight">
                Unete a la
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  Revolucion Inmobiliaria
                </span>
              </h1>
              <p className="text-lg text-blue-100">Mas de 10,000 profesionales confian en nosotros</p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-3 rounded-xl">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Herramientas Premium</h3>
                  <p className="text-blue-100 text-sm">Acceso a todas las funciones</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="bg-gradient-to-r from-green-400 to-emerald-400 p-3 rounded-xl">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Soporte 24/7</h3>
                  <p className="text-blue-100 text-sm">Asistencia cuando la necesites</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-3 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">100% Seguro</h3>
                  <p className="text-blue-100 text-sm">Datos protegidos y encriptados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-yellow-300/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/3 right-10 w-16 h-16 bg-orange-300/20 rounded-full blur-lg"></div>
      </div>

      <div className="w-full lg:w-3/5 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md space-y-8 min-h-[830px] flex flex-col justify-center">
          <div className="lg:hidden text-center">
            <img src="/images/logo-matriz-sin-fondo-negro.png" alt="Matriz Inmobiliaria" width={210} height={50} className="mx-auto" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Crea tu cuenta</h2>
            <p className="text-gray-600">Comienza tu viaje inmobiliario hoy mismo</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_documento" className="text-gray-700 font-medium flex items-center">
                    <User className="h-4 w-4 mr-2 text-[#00457B]" />
                    Tipo de documento
                  </Label>
                  <div className="relative">
                    <Select value={formData.tipo_documento} onValueChange={(value) => handleSelectChange("tipo_documento", value)}>
                      <SelectTrigger className={`h-12 pl-12 pr-4 rounded-xl border-2 transition-all duration-200 w-full ${fieldErrors.tipo_documento ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}>
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CC">Cedula de Ciudadania</SelectItem>
                        <SelectItem value="CE">Cedula de Extranjeria</SelectItem>
                        <SelectItem value="NIT">NIT</SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                        <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.tipo_documento && (
                      <div className="flex items-center mt-1 text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">{fieldErrors.tipo_documento}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_documento" className="text-gray-700 font-medium flex items-center">
                    <User className="h-4 w-4 mr-2 text-[#00457B]" />
                    Numero de documento
                  </Label>
                  <div className="relative">
                    <Input
                      id="numero_documento"
                      name="numero_documento"
                      placeholder="Numero de documento"
                      className={`h-12 pl-12 rounded-xl border-2 transition-all duration-200 ${fieldErrors.numero_documento ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}
                      value={formData.numero_documento}
                      onChange={handleChange}
                      onBlur={() => handleBlur("numero_documento")}
                      maxLength={formData.tipo_documento === "PASAPORTE" ? 20 : formData.tipo_documento === "TI" ? 11 : 10}
                      required
                    />
                    <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  </div>
                  {fieldErrors.numero_documento && (
                    <div className="flex items-center mt-1 text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">{fieldErrors.numero_documento}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_completo" className="text-gray-700 font-medium flex items-center">
                    <User className="h-4 w-4 mr-2 text-[#00457B]" />
                    Nombre completo
                  </Label>
                  <div className="relative">
                    <Input
                      id="nombre_completo"
                      name="nombre_completo"
                      placeholder="Tu nombre completo"
                      className={`h-12 pl-12 rounded-xl border-2 transition-all duration-200 ${fieldErrors.nombre_completo ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}
                      value={formData.nombre_completo}
                      onChange={handleChange}
                      onBlur={() => handleBlur("nombre_completo")}
                      maxLength={50}
                      required
                    />
                    <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  </div>
                  {fieldErrors.nombre_completo && (
                    <div className="flex items-center mt-1 text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">{fieldErrors.nombre_completo}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido_completo" className="text-gray-700 font-medium flex items-center">
                    <User className="h-4 w-4 mr-2 text-[#00457B]" />
                    Apellido completo
                  </Label>
                  <div className="relative">
                    <Input
                      id="apellido_completo"
                      name="apellido_completo"
                      placeholder="Tu apellido completo"
                      className={`h-12 pl-12 rounded-xl border-2 transition-all duration-200 ${fieldErrors.apellido_completo ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}
                      value={formData.apellido_completo}
                      onChange={handleChange}
                      onBlur={() => handleBlur("apellido_completo")}
                      maxLength={50}
                      required
                    />
                    <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  </div>
                  {fieldErrors.apellido_completo && (
                    <div className="flex items-center mt-1 text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">{fieldErrors.apellido_completo}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-[#00457B]" />
                  Correo electronico
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    className={`h-12 pl-12 pr-12 rounded-xl border-2 transition-all duration-200 ${fieldErrors.email ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur("email")}
                    maxLength={254}
                    required
                  />
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  {checkingEmail && <Loader2 className="absolute right-4 top-3.5 h-5 w-5 text-blue-500 animate-spin" />}
                  {!checkingEmail && emailAvailable !== null && (
                    emailAvailable ? (
                      <CheckCircle2 className="absolute right-4 top-3.5 h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="absolute right-4 top-3.5 h-5 w-5 text-red-500" />
                    )
                  )}
                </div>
                {fieldErrors.email && (
                  <div className="flex items-center mt-1 text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">{fieldErrors.email}</span>
                  </div>
                )}
                {!checkingEmail && emailAvailable === false && !fieldErrors.email && (
                  <div className="flex items-center mt-1 text-red-600">
                    <XCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Este correo ya esta registrado</span>
                  </div>
                )}
                {!checkingEmail && emailAvailable === true && !fieldErrors.email && (
                  <div className="flex items-center mt-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    <span className="text-sm">Correo disponible</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-gray-700 font-medium flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-[#00457B]" />
                  Telefono
                </Label>
                <div className="relative">
                  <Input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    placeholder="Tu numero de telefono"
                    className={`h-12 pl-12 rounded-xl border-2 transition-all duration-200 ${fieldErrors.telefono ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}
                    value={formData.telefono}
                    onChange={handleChange}
                    onBlur={() => handleBlur("telefono")}
                    maxLength={15}
                    required
                  />
                  <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                </div>
                {fieldErrors.telefono && (
                  <div className="flex items-center mt-1 text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">{fieldErrors.telefono}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-[#00457B]" />
                  Contrasena
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className={`h-12 pl-12 pr-12 rounded-xl border-2 transition-all duration-200 ${fieldErrors.password ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur("password")}
                    required
                  />
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-sm text-red-500 mt-1">{fieldErrors.password}</p>}
              </div>

              {formData.password && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Fortaleza de contrasena:</span>
                    <span className={`text-sm font-semibold ${getPasswordStrengthScore() <= 2 ? "text-red-600" : getPasswordStrengthScore() <= 3 ? "text-yellow-600" : getPasswordStrengthScore() <= 4 ? "text-blue-600" : "text-green-600"}`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`} style={{ width: `${(getPasswordStrengthScore() / 5) * 100}%` }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[{ key: "length", label: "8+ caracteres" }, { key: "uppercase", label: "Mayuscula" }, { key: "number", label: "Numero" }, { key: "special", label: "Simbolo" }].map(({ key, label }) => (
                      <div className="flex items-center" key={key}>
                        {passwordStrength[key] ? <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" /> : <XCircle className="h-3 w-3 text-red-500 mr-1" />}
                        <span className="text-gray-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium flex items-center">
                  <Lock className="h-4 w-4 mr-2 text-[#00457B]" />
                  Confirmar contrasena
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    className={`h-12 pl-12 pr-12 rounded-xl border-2 transition-all duration-200 ${fieldErrors.confirmPassword ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-[#00457B] focus:ring-[#00457B]"}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur("confirmPassword")}
                    required
                  />
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="text-sm text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <div className="flex items-center mt-2 text-red-600">
                    <XCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Las contrasenas no coinciden</span>
                  </div>
                )}
                {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="flex items-center mt-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    <span className="text-sm">Las contrasenas coinciden</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
              <Checkbox
                id="terminos"
                name="terminos"
                checked={formData.terminos}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, terminos: !!checked }))}
                className="h-5 w-5 mt-0.5 border-2 border-[#00457B] text-[#00457B] rounded-md"
                required
              />
              <Label htmlFor="terminos" className="text-gray-700 font-medium text-sm leading-relaxed">
                Acepto los
                <a href="/terminos" className="text-[#00457B] hover:text-[#003b69] font-semibold underline"> terminos y condiciones </a>
                y la
                <a href="/privacidad" className="text-[#00457B] hover:text-[#003b69] font-semibold underline"> politica de privacidad</a>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#00457B] to-[#0056A3] hover:from-[#003b69] hover:to-[#004a8f] rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group"
              disabled={isLoading || !formData.terminos || formData.password !== formData.confirmPassword}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creando cuenta...
                </div>
              ) : (
                <div className="flex items-center justify-center text-white">
                  Crear cuenta gratis
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium"></span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Ya tienes una cuenta?
              <a href="/login" className="text-[#00457B] font-semibold hover:text-[#003b69] transition-colors">
                Inicia sesion
              </a>
            </p>
            <p className="text-xs text-gray-500">(c) {new Date().getFullYear()} Matriz Inmobiliaria. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
