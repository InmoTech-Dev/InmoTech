import React from 'react';
import { Eye } from 'lucide-react';
import { ModalContainer } from '../common/modalContainer';
import { getEstadoColor, getEstadoDotColor } from '../../utils/helpers';

const getOwnerField = (owner = {}, type) => {
  const name =
    owner.nombreCompleto ||
    [owner.nombres, owner.apellidos].filter(Boolean).join(' ').trim() ||
    owner.nombre ||
    owner.nombre_completo;

  const email = owner.email || owner.correo;
  const phone = owner.telefono || owner.celular;

  if (type === 'name') return name || 'Sin asignar';
  if (type === 'email') return email || 'Sin correo';
  if (type === 'phone') return phone || 'Sin teléfono';
  return '';
};

export const VisualizarInmuebleModal = ({ isOpen, onClose, inmueble }) => {
  const footer = (
    <button
      onClick={onClose}
      className="w-full px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
    >
      Cerrar
    </button>
  );

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles del Inmueble"
      icon={Eye}
      footer={footer}
    >
      {inmueble && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Información General</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Título</label>
                <p className="text-base text-gray-900 font-medium">{inmueble.titulo}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Registro</label>
                  <p className="text-base text-gray-900 font-mono font-medium">{inmueble.registro}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Tipo</label>
                  <p className="text-base text-gray-900 font-medium">{inmueble.tipo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Operación</label>
                  <p className="text-base text-gray-900 font-medium">{inmueble.operacion}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Precio</label>
                  <p className="text-base text-gray-900 font-medium">${inmueble.precio?.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Estado</label>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getEstadoColor(inmueble.estado)}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${getEstadoDotColor(inmueble.estado)}`}></span>
                    {inmueble.estado}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Ciudad</label>
                  <p className="text-base text-gray-900 font-medium">{inmueble.ciudad}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Dirección</label>
                <p className="text-base text-gray-900 font-medium">{inmueble.direccion}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Comodidades</h3>
            <div className="grid grid-cols-2 gap-3">
              {inmueble.comodidades?.filter(c => c.seleccionada).map((comodidad, index) => (
                <div key={index} className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                  <span className="text-sm text-gray-700 font-medium flex-1">{comodidad.nombre}</span>
                  <span className="ml-auto text-slate-600 font-semibold">{comodidad.cantidad}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Propietario</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Nombre</label>
                <p className="text-base text-gray-900 font-medium">
                  {getOwnerField(inmueble.propietario, 'name')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Email</label>
                <p className="text-base text-gray-900 font-medium">
                  {getOwnerField(inmueble.propietario, 'email')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Teléfono</label>
                <p className="text-base text-gray-900 font-medium">
                  {getOwnerField(inmueble.propietario, 'phone')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContainer>
  );
};
