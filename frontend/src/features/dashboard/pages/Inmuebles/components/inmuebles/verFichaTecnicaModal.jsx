import React from 'react';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
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

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const formatCurrency = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return `$${parsed.toLocaleString('es-CO')}`;
};

const formatAmenityName = (value = '') => {
  const trimmed = String(value || '').trim();
  const key = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (key === 'banos') return 'Baños';
  if (key === 'bano') return 'Baño';
  return trimmed;
};

const parseCambios = (raw = '') =>
  String(raw)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

const COMPANY_PDF_INFO = {
  email: 'matriz_inmobiliaria@gmail.com',
  direccion: 'Medellin, Antioquia, Colombia',
  logoPath: '/images/logo-matriz-sin-fondo-negro.png',
};

const loadImageAsDataUrl = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo cargar la imagen: ${url}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generateFichaPdf = async ({ ficha, snapshot, inmueble }) => {
  if (!snapshot || !ficha) return;

  const doc = new jsPDF();
  const marginLeft = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerBottom = 40;
  let currentY = headerBottom + 6;
  const maxY = 280;
  let logoDataUrl = null;

  try {
    logoDataUrl = await loadImageAsDataUrl(COMPANY_PDF_INFO.logoPath);
  } catch (error) {
    console.warn('No se pudo cargar el logo para la ficha PDF:', error);
  }

  const drawHeader = () => {
    const logoMaxWidth = 72;
    const logoMaxHeight = 22;
    const logoX = marginLeft;
    const logoY = 10;

    if (logoDataUrl) {
      const props = doc.getImageProperties(logoDataUrl);
      const imageRatio = props.width / props.height;
      let drawWidth = logoMaxWidth;
      let drawHeight = drawWidth / imageRatio;

      if (drawHeight > logoMaxHeight) {
        drawHeight = logoMaxHeight;
        drawWidth = drawHeight * imageRatio;
      }

      doc.addImage(logoDataUrl, 'PNG', logoX, logoY + (logoMaxHeight - drawHeight) / 2, drawWidth, drawHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MATRIZ INMOBILIARIA', pageWidth - marginLeft, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(COMPANY_PDF_INFO.email, pageWidth - marginLeft, 22, { align: 'right' });
    doc.text(COMPANY_PDF_INFO.direccion, pageWidth - marginLeft, 28, { align: 'right' });
    doc.setDrawColor(203, 213, 225);
    doc.line(marginLeft, headerBottom, pageWidth - marginLeft, headerBottom);
  };

  const ensurePageSpace = (required = 10) => {
    if (currentY + required > maxY) {
      doc.addPage();
      drawHeader();
      currentY = headerBottom + 6;
    }
  };

  const addSectionTitle = (title) => {
    ensurePageSpace(10);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginLeft, currentY);
    currentY += 6;
  };

  const addPair = (label, value) => {
    if (!hasValue(value)) return;
    ensurePageSpace(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, marginLeft, currentY);
    doc.setFont('helvetica', 'normal');
    const text = doc.splitTextToSize(String(value), 150);
    doc.text(text, marginLeft + 35, currentY);
    currentY += 6 * (Array.isArray(text) ? text.length : 1);
  };

  const addBulletItem = (textValue) => {
    if (!hasValue(textValue)) return;
    ensurePageSpace(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`• ${String(textValue)}`, 175);
    doc.text(lines, marginLeft, currentY);
    currentY += 6 * (Array.isArray(lines) ? lines.length : 1);
  };

  drawHeader();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Ficha tecnica del inmueble', marginLeft, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Registro: ${snapshot.registro || inmueble?.registro || 'N/D'}`, marginLeft, currentY);
  currentY += 6;
  doc.text(`Version: ${ficha.version}    Fecha: ${ficha.fecha}`, marginLeft, currentY);
  currentY += 10;

  addSectionTitle('Informacion del inmueble');
  addPair('Titulo', snapshot.titulo);
  addPair('Tipo', snapshot.tipo);
  addPair('Operacion', snapshot.operacion);
  addPair('Estado', snapshot.estado);
  addPair('Area construida', hasValue(snapshot.area_construida) ? `${snapshot.area_construida} m2` : '');
  addPair('Canon arriendo', formatCurrency(snapshot.precio_arriendo));
  addPair('Precio venta', formatCurrency(snapshot.precio_venta));

  addSectionTitle('Ubicacion');
  addPair('Ciudad', snapshot.ciudad);
  addPair('Direccion', snapshot.direccion);

  if (hasValue(snapshot.descripcion)) {
    addSectionTitle('Descripcion');
    addPair('Detalle', snapshot.descripcion);
  }

  const comodidadesSeleccionadas = snapshot.comodidades?.filter((item) => item.seleccionada) || [];
  if (comodidadesSeleccionadas.length) {
    addSectionTitle('Comodidades');
    comodidadesSeleccionadas.forEach((amenity) => {
      addPair(formatAmenityName(amenity.nombre), `Cantidad: ${amenity.cantidad || 1}`);
    });
  }

  addSectionTitle('Propietario');
  addPair('Nombre', getOwnerField(snapshot.propietario, 'name'));
  addPair('Correo', getOwnerField(snapshot.propietario, 'email'));
  addPair('Telefono', getOwnerField(snapshot.propietario, 'phone'));

  if (Number(ficha.version) > 1 && hasValue(ficha.cambios)) {
    addSectionTitle('Comparacion con ficha anterior');
    parseCambios(ficha.cambios).forEach((item) => {
      addBulletItem(item);
    });
  }

  doc.save(`ficha-${snapshot.registro || inmueble?.registro || ficha.version}.pdf`);
};

export const VerFichaTecnicaModal = ({ isOpen, onClose, inmueble, ficha }) => {
  const snapshot = ficha?.snapshot || inmueble;
  const selectedAmenities = (snapshot?.comodidades || []).filter((item) => item?.seleccionada);
  const visibleAmenities = selectedAmenities.slice(0, 8);
  const hiddenAmenitiesCount = Math.max(0, selectedAmenities.length - visibleAmenities.length);

  const operacionTexto = String(snapshot?.operacion || '').toLowerCase();
  const allowsVenta = operacionTexto.includes('venta');
  const allowsArriendo = operacionTexto.includes('arriendo');

  const ownerName = getOwnerField(snapshot?.propietario, 'name');
  const ownerEmail = getOwnerField(snapshot?.propietario, 'email');
  const ownerPhone = getOwnerField(snapshot?.propietario, 'phone');
  const hasOwnerInfo = hasValue(ownerName) || hasValue(ownerEmail) || hasValue(ownerPhone);

  const generalItems = [
    { label: 'Tipo', value: snapshot?.tipo },
    { label: 'Operacion', value: snapshot?.operacion },
    { label: 'Area construida', value: hasValue(snapshot?.area_construida) ? `${snapshot.area_construida} m2` : '' },
    { label: 'Version', value: hasValue(ficha?.version) ? String(ficha.version) : '' },
  ].filter((item) => hasValue(item.value));

  const precioVenta = formatCurrency(snapshot?.precio_venta);
  const precioArriendo = formatCurrency(snapshot?.precio_arriendo);
  const showPrecioVenta = hasValue(precioVenta) && (allowsVenta || !hasValue(snapshot?.operacion));
  const showPrecioArriendo = hasValue(precioArriendo) && (allowsArriendo || !hasValue(snapshot?.operacion));
  const ubicacionTexto = [snapshot?.direccion, snapshot?.ciudad].filter((v) => hasValue(v)).join(', ');

  const handleDownloadPdf = () => {
    generateFichaPdf({ ficha, snapshot, inmueble });
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
      title="Ficha Tecnica"
      icon={FileText}
      footer={footer}
    >
      {snapshot && ficha && (
        <div className="space-y-4">
          {hasOwnerInfo && (
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
              <div className="flex-1">
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
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {hasValue(snapshot.titulo) && (
                  <h3 className="text-lg font-semibold text-slate-900 leading-tight">{snapshot.titulo}</h3>
                )}
                {hasValue(snapshot.registro) && (
                  <p className="mt-1 text-xs text-slate-500 font-mono">{snapshot.registro}</p>
                )}
                {hasValue(ficha.fecha) && (
                  <p className="mt-1 text-xs text-slate-500">Fecha ficha: {ficha.fecha}</p>
                )}
              </div>
              {hasValue(snapshot.estado) && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getEstadoColor(snapshot.estado)}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${getEstadoDotColor(snapshot.estado)}`}></span>
                  {snapshot.estado}
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

            {hasValue(snapshot.descripcion) && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Descripcion</p>
                <p className="text-sm text-slate-700 leading-relaxed">{snapshot.descripcion}</p>
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
                    <span className="font-medium">{formatAmenityName(comodidad.nombre)}</span>
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

          {Number(ficha.version) > 1 && hasValue(ficha.cambios) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Comparacion con ficha anterior
              </h4>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {parseCambios(ficha.cambios).map((item, index) => (
                  <li key={`cambio-${index}`} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ModalContainer>
  );
};
