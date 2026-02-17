import React from 'react';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { ModalContainer } from '../common/modalContainer';
import { getEstadoColor } from '../../utils/helpers';

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

export const VerFichaTecnicaModal = ({ isOpen, onClose, inmueble, ficha }) => {
  const snapshot = ficha?.snapshot || inmueble;

  const handleDownloadPdf = () => {
    if (!snapshot || !ficha) return;

    const doc = new jsPDF();
    const marginLeft = 15;
    let currentY = 20;

    const addSectionTitle = (title) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, marginLeft, currentY);
      currentY += 6;
    };

    const addPair = (label, value) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, marginLeft, currentY);
      doc.setFont('helvetica', 'normal');
      const text = doc.splitTextToSize(value || 'N/A', 180);
      doc.text(text, marginLeft + 28, currentY);
      currentY += 6 * (Array.isArray(text) ? text.length : 1);
    };

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ficha técnica del inmueble', marginLeft, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.text(`Registro: ${snapshot.registro || inmueble?.registro || 'N/D'}`, marginLeft, currentY);
    currentY += 6;
    doc.text(`Versión: ${ficha.version}    Fecha: ${ficha.fecha}`, marginLeft, currentY);
    currentY += 10;

    addSectionTitle('Información del inmueble');
    addPair('Título', snapshot.titulo);
    addPair('Tipo', snapshot.tipo);
    addPair('Operación', snapshot.operacion);
    const precio = snapshot.precio_venta || snapshot.precio_arriendo || snapshot.precio;
    addPair('Precio', precio ? `$${Number(precio).toLocaleString()}` : 'Sin definir');
    addPair('Estado', snapshot.estado);

    addSectionTitle('Ubicación');
    addPair('Ciudad', snapshot.ciudad);
    addPair('Dirección', snapshot.direccion);

    const comodidadesSeleccionadas = snapshot.comodidades?.filter((item) => item.seleccionada) || [];
    if (comodidadesSeleccionadas.length) {
      addSectionTitle('Comodidades');
      comodidadesSeleccionadas.forEach((amenity) => {
        addPair(amenity.nombre, `Cantidad: ${amenity.cantidad}`);
      });
    }

    addSectionTitle('Propietario');
    addPair('Nombre', getOwnerField(snapshot.propietario, 'name'));
    addPair('Correo', getOwnerField(snapshot.propietario, 'email'));
    addPair('Teléfono', getOwnerField(snapshot.propietario, 'phone'));

    addSectionTitle('Cambios relevantes');
    const cambios = ficha.cambios || 'Actualización sin descripción';
    const splitted = doc.splitTextToSize(cambios, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(splitted, marginLeft, currentY);

    doc.save(`ficha-${inmueble.registro || ficha.version}.pdf`);
  };

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        onClick={handleDownloadPdf}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Download className="h-4 w-4" />
        Descargar PDF
      </button>
      <button
        onClick={onClose}
        className="w-full px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
      >
        Cerrar
      </button>
    </div>
  );

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha Técnica"
      icon={FileText}
      footer={footer}
    >
      {snapshot && ficha && (
        <div className="space-y-6">
          <div className="bg-slate-100 border-l-4 border-slate-600 rounded-lg p-4">
            <h3 className="text-base font-bold text-gray-900 mb-2">{snapshot.titulo}</h3>
            <p className="text-xs text-gray-600">Registro: {snapshot.registro}</p>
            <p className="text-xs text-gray-600 mt-1">Versión {ficha.version} - {ficha.fecha}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide">Información del Inmueble</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Tipo</label>
                <p className="text-sm font-medium text-gray-900">{snapshot.tipo}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Operación</label>
                <p className="text-sm font-medium text-gray-900">{snapshot.operacion}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Precio</label>
                <p className="text-sm font-medium text-gray-900">
                  {snapshot.precio_venta || snapshot.precio_arriendo
                    ? `$${Number(snapshot.precio_venta || snapshot.precio_arriendo || 0).toLocaleString()}`
                    : 'Sin definir'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Estado</label>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getEstadoColor(snapshot.estado)}`}>
                  {snapshot.estado}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide">Ubicación</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Ciudad</label>
                <p className="text-sm font-medium text-gray-900">{snapshot.ciudad}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Dirección</label>
                <p className="text-sm font-medium text-gray-900">{snapshot.direccion}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide">Comodidades</h4>
            <div className="grid grid-cols-2 gap-3">
              {snapshot.comodidades?.filter(c => c.seleccionada).map((comodidad, index) => (
                <div key={index} className="flex items-center justify-between gap-3 bg-slate-50 rounded p-3 border border-slate-200">
                  <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                  <span className="text-sm text-gray-700 font-medium flex-1">{comodidad.nombre}</span>
                  <span className="ml-auto text-slate-600 font-bold">{comodidad.cantidad}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wide">Propietario</h4>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Nombre</label>
                <p className="text-sm font-medium text-gray-900">
                  {getOwnerField(inmueble.propietario, 'name')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Email</label>
                <p className="text-sm font-medium text-gray-900">
                  {getOwnerField(inmueble.propietario, 'email')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Teléfono</label>
                <p className="text-sm font-medium text-gray-900">
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
