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

  if (type === 'name') return name || '';
  if (type === 'email') return email || '';
  if (type === 'phone') return phone || '';
  return '';
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return `$${numericValue.toLocaleString('es-CO')}`;
};

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const VisualizarInmuebleModal = ({ isOpen, onClose, inmueble }) => {
  const selectedAmenities = (inmueble?.comodidades || []).filter((item) => item?.seleccionada);
  const visibleAmenities = selectedAmenities.slice(0, 8);
  const hiddenAmenitiesCount = Math.max(0, selectedAmenities.length - visibleAmenities.length);
  const operacionTexto = String(inmueble?.operacion || '').toLowerCase();
  const allowsVenta = operacionTexto.includes('venta');
  const allowsArriendo = operacionTexto.includes('arriendo');

  const ownerName = getOwnerField(inmueble?.propietario, 'name');
  const ownerEmail = getOwnerField(inmueble?.propietario, 'email');
  const ownerPhone = getOwnerField(inmueble?.propietario, 'phone');
  const hasOwnerInfo = hasValue(ownerName) || hasValue(ownerEmail) || hasValue(ownerPhone);

  const generalItems = [
    { label: 'Tipo', value: inmueble?.tipo },
    { label: 'Operacion', value: inmueble?.operacion },
    { label: 'Area construida', value: hasValue(inmueble?.area_construida) ? `${inmueble.area_construida} m2` : '' },
    { label: 'Barrio/Sector', value: inmueble?.barrio },
  ].filter((item) => hasValue(item.value));

  const precioVenta = formatCurrency(inmueble?.precio_venta);
  const precioArriendo = formatCurrency(inmueble?.precio_arriendo);
  const showPrecioVenta = hasValue(precioVenta) && (allowsVenta || !hasValue(inmueble?.operacion));
  const showPrecioArriendo = hasValue(precioArriendo) && (allowsArriendo || !hasValue(inmueble?.operacion));

  const ubicacionTexto = [inmueble?.direccion, inmueble?.ciudad].filter((v) => hasValue(v)).join(', ');

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
        <div className="space-y-4">
          {hasOwnerInfo && (
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-600">Propietario</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {hasValue(ownerName) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre</p>
                    <p className="text-sm font-semibold text-slate-900">{ownerName}</p>
                  </div>
                )}
                {hasValue(ownerEmail) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Correo</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{ownerEmail}</p>
                  </div>
                )}
                {hasValue(ownerPhone) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Telefono</p>
                    <p className="text-sm font-medium text-slate-900">{ownerPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {hasValue(inmueble.titulo) && (
                  <h3 className="text-lg font-semibold text-slate-900 leading-tight">{inmueble.titulo}</h3>
                )}
                {hasValue(inmueble.registro) && (
                  <p className="mt-1 text-xs text-slate-500 font-mono">{inmueble.registro}</p>
                )}
              </div>
              {hasValue(inmueble.estado) && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getEstadoColor(inmueble.estado)}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${getEstadoDotColor(inmueble.estado)}`}></span>
                  {inmueble.estado}
                </span>
              )}
            </div>

            {generalItems.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {generalItems.map((item) => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {(showPrecioArriendo || showPrecioVenta || hasValue(ubicacionTexto)) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {showPrecioArriendo && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Canon de arriendo</p>
                    <p className="text-sm font-semibold text-slate-900">{precioArriendo}</p>
                  </div>
                )}
                {showPrecioVenta && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Precio de venta</p>
                    <p className="text-sm font-semibold text-slate-900">{precioVenta}</p>
                  </div>
                )}
                {hasValue(ubicacionTexto) && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ubicacion</p>
                    <p className="text-sm font-medium text-slate-900">{ubicacionTexto}</p>
                  </div>
                )}
              </div>
            )}

            {hasValue(inmueble.descripcion) && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Descripcion</p>
                <p className="text-sm text-slate-700 leading-relaxed">{inmueble.descripcion}</p>
              </div>
            )}
          </div>

          {selectedAmenities.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Caracteristicas</h3>
                <span className="text-xs font-semibold text-slate-500">{selectedAmenities.length} en total</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleAmenities.map((comodidad, index) => (
                  <span
                    key={`${comodidad.nombre}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                    <span className="font-medium">{comodidad.nombre}</span>
                    <span className="font-semibold text-slate-500">x{comodidad.cantidad || 1}</span>
                  </span>
                ))}
                {hiddenAmenitiesCount > 0 && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                    +{hiddenAmenitiesCount} mas
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </ModalContainer>
  );
};
