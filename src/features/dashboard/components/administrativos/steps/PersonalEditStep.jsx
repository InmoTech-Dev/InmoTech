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
    <div className="h-full flex flex-col gap-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-800">Editar Informacion Personal</h3>
        <p className="text-sm text-slate-600">Modifica los datos personales del administrativo</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Administrativo actual</span>
        </div>
        <div className="grid grid-cols-1 gap-1 text-sm text-slate-600 md:grid-cols-2 md:gap-3">
          <p><strong>Codigo:</strong> {administrativo?.codigo_empleado}</p>
          <p><strong>Documento:</strong> {administrativo?.persona?.tipo_documento} {administrativo?.persona?.numero_documento}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
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
            <p className="text-xs text-red-600">{errors.nombreCompleto}</p>
          )}
        </div>

        <div className="space-y-1.5">
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
            <p className="text-xs text-red-600">{errors.apellidoCompleto}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
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
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefono" className="text-sm font-medium text-slate-700">
            Telefono *
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
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
          {errors.telefono && (
            <p className="text-xs text-red-600">{errors.telefono}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
        <div className="mb-1 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Informacion importante</span>
        </div>
        <ul className="space-y-0.5 text-xs text-blue-700">
          <li>- Documento y tipo de documento no se modifican por seguridad.</li>
          <li>- La contrasena se gestiona desde configuracion de cuenta.</li>
        </ul>
      </div>
    </div>
  );
};

export default PersonalEditStep;
