import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import { ModalContainer } from '../common/modalContainer';

export const FichasTecnicasModal = ({ isOpen, onClose, inmueble, onVerFicha }) => {
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
      title="Fichas Técnicas"
      icon={FileText}
      footer={footer}
    >
      {inmueble && (
        <div>
          <div className="mb-6 pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Inmueble: <span className="font-semibold text-gray-900">{inmueble.titulo}</span></p>
            <p className="text-sm text-gray-600">Total de fichas: <span className="font-semibold text-gray-900">{inmueble.fichasTecnicas?.length || 0}</span></p>
          </div>

          <div className="space-y-3">
            {inmueble.fichasTecnicas?.map((ficha, index) => (
              <div key={ficha.id} className="border border-gray-200 rounded-lg p-4 hover:border-slate-400 hover:bg-slate-50 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">Versión {ficha.version}</span>
                      {index === 0 && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          Reciente
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{ficha.fecha}</span>
                    </div>
                    <p className="text-sm text-gray-700">{ficha.cambios}</p>
                  </div>
                  <button
                    onClick={() => onVerFicha(ficha)}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-semibold whitespace-nowrap"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalContainer>
  );
};