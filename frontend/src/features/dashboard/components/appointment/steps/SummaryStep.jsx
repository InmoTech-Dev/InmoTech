import React from 'react';
import { CheckCircle, User, Briefcase, Users, Mail, Phone, Calendar } from 'lucide-react';

const SummaryStep = ({ formData }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Resumen del Administrativo</h3>
        <p className="text-slate-600 text-sm">Verifica que toda la información sea correcta antes de crear</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-slate-800">Información Personal</h4>
        </div>

        <div className="grid grid-cols-2 gap-4 pl-7">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Tipo de Documento</p>
            <p className="text-sm text-slate-800">{formData.tipoDocumento || 'No especificado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Número de Documento</p>
            <p className="text-sm text-slate-800">{formData.numeroDocumento || 'No especificado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Nombre Completo</p>
            <p className="text-sm text-slate-800">{formData.nombreCompleto || 'No especificado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Apellido Completo</p>
            <p className="text-sm text-slate-800">{formData.apellidoCompleto || 'No especificado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Email</p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-800">{formData.email || 'No especificado'}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Teléfono</p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-800">{formData.telefono || 'No especificado'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-slate-800">Información Laboral</h4>
        </div>

        <div className="grid grid-cols-2 gap-4 pl-7">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Fecha de Ingreso</p>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <p className="text-sm text-slate-800">
                {formData.fechaIngreso ? new Date(formData.fechaIngreso).toLocaleDateString('es-CO') : 'No especificada'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-slate-800">Rol Administrativo</h4>
        </div>

        <div className="pl-7">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-600">Rol Asignado</p>
            <p className="text-sm text-slate-800">{formData.rol ? formData.rol : 'No especificado'}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Listo para crear</p>
            <p className="text-sm text-green-700">
              Crearemos el administrativo y enviaremos un correo con código y enlace para que defina su contraseña.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;
