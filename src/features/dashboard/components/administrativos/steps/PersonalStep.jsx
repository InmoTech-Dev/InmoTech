import React, { useState } from 'react';
import { Label } from '../../../../../shared/components/ui/label';
import { Input } from '../../../../../shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../shared/components/ui/select';
import { formatPhoneNumber } from '../../../../../shared/utils/phoneFormatter';

const PersonalStep = ({ formData, errors, updateFormData }) => {
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
        <h3 className="text-lg font-semibold text-slate-800">Información Personal</h3>
        <p className="text-slate-600 text-sm">Ingresa los datos personales del nuevo administrativo</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipoDocumento" className="text-sm font-medium text-slate-700">
            Tipo de Documento *
          </Label>
          <Select
            value={formData.tipoDocumento}
            onValueChange={(value) => updateFormData('tipoDocumento', value)}
          >
            <SelectTrigger className={`h-10 ${errors.tipoDocumento ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
              <SelectItem value="CE">Cédula de Extranjería</SelectItem>
              <SelectItem value="NIT">NIT</SelectItem>
              <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
              <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipoDocumento && (
            <p className="text-sm text-red-600">{errors.tipoDocumento}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="numeroDocumento" className="text-sm font-medium text-slate-700">
            Número de Documento *
          </Label>
          <Input
            id="numeroDocumento"
            type="text"
            value={formData.numeroDocumento}
            onChange={(e) => updateFormData('numeroDocumento', e.target.value)}
            onKeyDown={(e) => {
              const allowedKeys = [
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                ' ', '-', '.', 'Backspace', 'Tab', 'Enter',
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete'
              ];
              if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
              }
            }}
            className={`h-10 ${errors.numeroDocumento ? 'border-red-500' : ''}`}
            placeholder="Ingresa el número"
          />
          {errors.numeroDocumento && (
            <p className="text-sm text-red-600">{errors.numeroDocumento}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombreCompleto" className="text-sm font-medium text-slate-700">
            Nombre Completo *
          </Label>
          <Input
            id="nombreCompleto"
            type="text"
            value={formData.nombreCompleto}
            onChange={(e) => updateFormData('nombreCompleto', e.target.value)}
            onKeyDown={(e) => {
              const allowedKeys = [
                'a','b','c','d','e','f','g','h','i','j','k','l','m',
                'n','o','p','q','r','s','t','u','v','w','x','y','z',
                'A','B','C','D','E','F','G','H','I','J','K','L','M',
                'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
                ' ', 'Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight',
                'ArrowUp', 'ArrowDown', 'Delete'
              ];
              if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
              }
            }}
            className={`h-10 ${errors.nombreCompleto ? 'border-red-500' : ''}`}
            placeholder="Ingresa el nombre completo"
          />
          {errors.nombreCompleto && (
            <p className="text-sm text-red-600">{errors.nombreCompleto}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="apellidoCompleto" className="text-sm font-medium text-slate-700">
            Apellido Completo *
          </Label>
          <Input
            id="apellidoCompleto"
            type="text"
            value={formData.apellidoCompleto}
            onChange={(e) => updateFormData('apellidoCompleto', e.target.value)}
            onKeyDown={(e) => {
              const allowedKeys = [
                'a','b','c','d','e','f','g','h','i','j','k','l','m',
                'n','o','p','q','r','s','t','u','v','w','x','y','z',
                'A','B','C','D','E','F','G','H','I','J','K','L','M',
                'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
                ' ', 'Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight',
                'ArrowUp', 'ArrowDown', 'Delete'
              ];
              if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
              }
            }}
            className={`h-10 ${errors.apellidoCompleto ? 'border-red-500' : ''}`}
            placeholder="Ingresa el apellido completo"
          />
          {errors.apellidoCompleto && (
            <p className="text-sm text-red-600">{errors.apellidoCompleto}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={`h-10 ${errors.email ? 'border-red-500' : ''}`}
            placeholder="correo@ejemplo.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono" className="text-sm font-medium text-slate-700">
            Teléfono *
          </Label>
          <Input
            id="telefono"
            type="tel"
            value={formData.telefono}
            onChange={handlePhoneChange}
            onKeyDown={handlePhoneKeyDown}
            className={`h-10 ${errors.telefono ? 'border-red-500' : ''}`}
            placeholder="+57 300 000 0000"
          />
          {errors.telefono && (
            <p className="text-sm text-red-600">{errors.telefono}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Al guardar, enviaremos un correo al administrativo para que confirme su cuenta y defina su contraseña.
      </div>
    </div>
  );
};

export default PersonalStep;
