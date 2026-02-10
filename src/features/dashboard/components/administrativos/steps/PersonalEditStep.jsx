import React, { useState } from 'react';
import { Label } from '../../../../../shared/components/ui/label';
import { Input } from '../../../../../shared/components/ui/input';
import { User, Mail, Phone, FileText } from 'lucide-react';
import { formatPhoneNumber } from '../../../../../shared/utils/phoneFormatter';

const PersonalEditStep = ({ formData, errors, updateFormData, administrativo }) => {
  const [prevPhone, setPrevPhone] = useState('');

  const handlePhoneChange = (e) => {
    const newValue = e.target.value;
    const formatted = formatPhoneNumber(newValue, prevPhone, false);
    setPrevPhone(formatted);
    updateFormData('telefono', formatted);
  };

  const handlePhoneKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const formatted = formatPhoneNumber(
        formData.telefono.slice(0, -1),
        formData.telefono,
        true
      );
      setPrevPhone(formatted);
      updateFormData('telefono', formatted);
      e.preventDefault();
    }
  };
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Editar Información Personal</h3>
        <p className="text-slate-600 text-sm">Modifica los datos personales del administrativo</p>
      </div>

      {/* Información del administrativo actual */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Administrativo actual</span>
        </div>
        <p className="text-sm text-slate-600">
          <strong>Código:</strong> {administrativo?.codigo_empleado} |
          <strong> Documento:</strong> {administrativo?.persona?.tipo_documento} {administrativo?.persona?.numero_documento}
        </p>
      </div>

      {/* Nombre Completo */}
      <div className="space-y-2">
        <Label htmlFor="nombreCompleto" className="text-sm font-medium text-slate-700">
          Nombre Completo *
        </Label>
        <Input
          id="nombreCompleto"
          type="text"
          value={formData.nombreCompleto}
          onChange={(e) => updateFormData('nombreCompleto', e.target.value)}
          className={`h-10 ${errors.nombreCompleto ? 'border-red-500' : ''}`}
          placeholder="Ingresa el nombre completo"
        />
        {errors.nombreCompleto && (
          <p className="text-sm text-red-600">{errors.nombreCompleto}</p>
        )}
      </div>

      {/* Apellido Completo */}
      <div className="space-y-2">
        <Label htmlFor="apellidoCompleto" className="text-sm font-medium text-slate-700">
          Apellido Completo *
        </Label>
        <Input
          id="apellidoCompleto"
          type="text"
          value={formData.apellidoCompleto}
          onChange={(e) => updateFormData('apellidoCompleto', e.target.value)}
          className={`h-10 ${errors.apellidoCompleto ? 'border-red-500' : ''}`}
          placeholder="Ingresa el apellido completo"
        />
        {errors.apellidoCompleto && (
          <p className="text-sm text-red-600">{errors.apellidoCompleto}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email *
        </Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={`h-10 pl-10 ${errors.email ? 'border-red-500' : ''}`}
            placeholder="correo@ejemplo.com"
          />
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Teléfono */}
      <div className="space-y-2">
        <Label htmlFor="telefono" className="text-sm font-medium text-slate-700">
          Teléfono *
        </Label>
        <div className="relative">
          <Input
            id="telefono"
            type="tel"
            value={formData.telefono}
            onChange={handlePhoneChange}
            onKeyDown={handlePhoneKeyDown}
            className={`h-10 pl-10 ${errors.telefono ? 'border-red-500' : ''}`}
            placeholder="+57 300 000 0000"
          />
          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
        {errors.telefono && (
          <p className="text-sm text-red-600">{errors.telefono}</p>
        )}
      </div>

      {/* Información adicional */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Información importante</span>
        </div>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• El tipo y número de documento no se pueden modificar por seguridad</li>
          <li>• La contraseña no se puede cambiar desde aquí</li>
          <li>• Los cambios se aplicarán inmediatamente después de guardar</li>
        </ul>
      </div>
    </div>
  );
};

export default PersonalEditStep;
