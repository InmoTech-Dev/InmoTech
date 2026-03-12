import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, FileText, Hash } from 'lucide-react';
import { formatPhoneNumber } from '../../../../../shared/utils/phoneFormatter';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../shared/components/ui/select';

const CustomerStep = ({
  formData,
  errors,
  updateFormData,
  onFieldComplete,
  isSearchingPerson = false,
}) => {
  const [prevPhone, setPrevPhone] = useState("");

  // Refs para los campos
  const nombreRef = useRef(null);
  const apellidoRef = useRef(null);
  const telefonoRef = useRef(null);
  const emailRef = useRef(null);
  const tipoDocumentoRef = useRef(null);
  const numeroDocumentoRef = useRef(null);

  // Scroll automático al siguiente campo
  const scrollToNextField = (currentField) => {
    const fieldOrder = [
      "nombre",
      "apellido",
      "telefono",
      "email",
      "tipoDocumento",
      "numeroDocumento",
    ];
    const currentIndex = fieldOrder.indexOf(currentField);

    if (currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      const nextRef = {
        nombre: nombreRef,
        apellido: apellidoRef,
        telefono: telefonoRef,
        email: emailRef,
        tipoDocumento: tipoDocumentoRef,
        numeroDocumento: numeroDocumentoRef,
      }[nextField];

      if (nextRef?.current) {
        nextRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Enfocar el siguiente campo después de un breve delay
        setTimeout(() => {
          nextRef.current.focus();
        }, 300);
      }
    }
  };

  // Detectar cuando un campo se completa
  // Eliminamos la transición automática para nombre y email
  useEffect(() => {
    if (
      formData.telefono &&
      formData.telefono.length >= 10 &&
      !errors.telefono
    ) {
      scrollToNextField("telefono");
    }
  }, [formData.telefono, errors.telefono]);

  useEffect(() => {
    if (formData.tipoDocumento && !errors.tipoDocumento) {
      scrollToNextField("tipoDocumento");
    }
  }, [formData.tipoDocumento, errors.tipoDocumento]);

  useEffect(() => {
    if (formData.numeroDocumento && !errors.numeroDocumento) {
      scrollToNextField("numeroDocumento");
    }
  }, [formData.numeroDocumento, errors.numeroDocumento]);

  const handlePhoneChange = (e) => {
    const newValue = e.target.value;
    const formatted = formatPhoneNumber(newValue, prevPhone, false);
    setPrevPhone(formatted);
    updateFormData("telefono", formatted);
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === "Backspace") {
      const formatted = formatPhoneNumber(
        formData.telefono.slice(0, -1),
        formData.telefono,
        true
      );
      setPrevPhone(formatted);
      updateFormData("telefono", formatted);
      e.preventDefault();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          Información del Cliente
        </h3>
        <p className="text-slate-600">
          Ingresa los datos del cliente para la cita
        </p>
      </div>

      <div className="space-y-4">
        {/* Document Information Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Tipo de Documento *
            </label>
            <Select
              value={formData.tipoDocumento}
              onValueChange={(value) => updateFormData("tipoDocumento", value)}
            >
              <SelectTrigger
                ref={tipoDocumentoRef}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.tipoDocumento ? "border-red-500" : "border-slate-300"
                  }`}
              >
                <SelectValue placeholder="Seleccionar tipo de documento" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="CC">Cédula de Ciudadanía (CC)</SelectItem>
                <SelectItem value="CE">Cédula de Extranjería (CE)</SelectItem>
                <SelectItem value="NIT">NIT</SelectItem>
                <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                <SelectItem value="TI">Tarjeta de Identidad (TI)</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipoDocumento && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mt-1"
              >
                {errors.tipoDocumento}
              </motion.p>
            )}
          </div>

          {/* Número de Documento */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Hash className="w-4 h-4 inline mr-2" />
              Número de Documento *
            </label>
            <input
              ref={numeroDocumentoRef}
              type="text"
              value={formData.numeroDocumento}
              onChange={(e) =>
                updateFormData("numeroDocumento", e.target.value)
              }
              onKeyDown={(e) => {
                const allowedKeys = [
                  "0",
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  " ",
                  "-",
                  ".",
                  "Backspace",
                  "Tab",
                  "Enter",
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Delete",
                ];
                if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                }
              }}
              placeholder="Ej: 12345678"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.numeroDocumento ? "border-red-500" : "border-slate-300"
                }`}
            />
            {errors.numeroDocumento && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mt-1"
              >
                {errors.numeroDocumento}
              </motion.p>
            )}
            {isSearchingPerson && (
              <div className="text-blue-500 text-sm mt-1 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Buscando información...
              </div>
            )}
          </div>
        </div>

        {/* Nombre y Apellido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nombre *
            </label>
            <input
              ref={nombreRef}
              type="text"
              value={formData.nombre || ''}
              onChange={(e) => updateFormData("nombre", e.target.value)}
              placeholder="Ej: Juan"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.nombre ? "border-red-500" : "border-slate-300"
                }`}
            />
            {errors.nombre && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mt-1"
              >
                {errors.nombre}
              </motion.p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Apellido *
            </label>
            <input
              ref={apellidoRef}
              type="text"
              value={formData.apellido || ''}
              onChange={(e) => updateFormData("apellido", e.target.value)}
              placeholder="Ej: Pérez"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.apellido ? "border-red-500" : "border-slate-300"
                }`}
            />
            {errors.apellido && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm mt-1"
              >
                {errors.apellido}
              </motion.p>
            )}
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Teléfono *
          </label>
          <input
            ref={telefonoRef}
            type="tel"
            value={formData.telefono}
            onChange={handlePhoneChange}
            onKeyDown={handlePhoneKeyDown}
            placeholder="+57 300 123 4567"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.telefono ? "border-red-500" : "border-slate-300"
              }`}
          />
          {errors.telefono && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm mt-1"
            >
              {errors.telefono}
            </motion.p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Correo Electrónico *
          </label>
          <input
            ref={emailRef}
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData("email", e.target.value)}
            placeholder="Ej: juan.perez@email.com"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.email ? "border-red-500" : "border-slate-300"
              }`}
          />
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm mt-1"
            >
              {errors.email}
            </motion.p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>Nota:</strong> Todos los campos marcados con (*) son
          obligatorios para continuar al siguiente paso.
        </p>
      </div>
    </motion.div>
  );
};

export default CustomerStep;