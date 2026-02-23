import React from 'react';
import { FileText, Calendar, Eye, Download } from 'lucide-react';
import { ModalContainer } from '../common/modalContainer';
import { generateFichaPdf } from './verFichaTecnicaModal';

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

export const FichasTecnicasModal = ({ isOpen, onClose, inmueble, onVerFicha }) => {
  const fichas = inmueble?.fichasTecnicas || [];

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
      title="Fichas Tecnicas"
      icon={FileText}
      footer={footer}
    >
      {inmueble && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {hasValue(inmueble.titulo) && (
                  <p className="text-sm text-slate-700">
                    Inmueble: <span className="font-semibold text-slate-900">{inmueble.titulo}</span>
                  </p>
                )}
                {hasValue(inmueble.registro) && (
                  <p className="text-xs text-slate-500 mt-1">Registro: {inmueble.registro}</p>
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {fichas.length} ficha(s)
              </span>
            </div>
          </div>

          {fichas.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              No hay fichas tecnicas registradas para este inmueble.
            </div>
          ) : (
            <div className="space-y-3">
              {fichas.map((ficha, index) => {
                const snapshot = ficha?.snapshot || inmueble;
                return (
                  <div
                    key={ficha.id || `${ficha.version}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                            Version {ficha.version}
                          </span>
                          {index === 0 && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                              Reciente
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>{ficha.fecha}</span>
                        </div>
                        {Number(ficha.version) > 1 && hasValue(ficha.cambios) && (
                          <div className="text-sm text-slate-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                              Comparacion con ficha anterior
                            </p>
                            <ul className="space-y-1">
                              {String(ficha.cambios)
                                .split('|')
                                .map((item) => item.trim())
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((item, idx) => (
                                  <li key={`${ficha.id || ficha.version}-cambio-${idx}`} className="line-clamp-1">
                                    {item}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => onVerFicha(ficha)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors text-xs font-semibold"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </button>
                        <button
                          onClick={() => generateFichaPdf({ ficha, snapshot, inmueble })}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold"
                        >
                          <Download className="h-4 w-4" />
                          Descargar PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </ModalContainer>
  );
};
