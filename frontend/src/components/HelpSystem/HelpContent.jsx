import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Compass,
  Info,
  Layers3,
  MapPin,
  Sparkles
} from 'lucide-react';
import HelpSection from './HelpSection';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  return isMobile;
};

const HelpContent = ({
  activeModule,
  visibleModules,
  currentRouteModuleId,
  onBackToDashboard,
  onSelectModule
}) => {
  const isMobile = useIsMobile();
  const [expandedSectionId, setExpandedSectionId] = useState(null);

  const dashboardCards = useMemo(
    () => visibleModules.filter((moduleItem) => moduleItem.id !== 'dashboard'),
    [visibleModules]
  );

  useEffect(() => {
    const firstSectionId = activeModule?.visibleSections?.[0]?.id || null;
    setExpandedSectionId(firstSectionId);
  }, [activeModule?.id]);

  if (!activeModule) {
    return null;
  }

  const Icon = activeModule.icon;
  const isCurrentModule = activeModule.id === currentRouteModuleId;
  const visibleSections = activeModule.visibleSections || [];
  const contextualLabel = isCurrentModule ? 'En tu pagina actual' : 'Exploracion guiada';

  return (
    <div className="help-panel-content flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-5"
          >
            <section className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_44px_rgba(15,23,42,0.06)] sm:p-6">
              <div>
                {activeModule.id !== 'dashboard' ? (
                  <button
                    type="button"
                    onClick={onBackToDashboard}
                    className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Ver todos los modulos
                  </button>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
                  <div className="rounded-[26px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 shadow-[0_12px_24px_rgba(37,99,235,0.08)]">
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                            <Sparkles className="h-3.5 w-3.5" />
                            Modulo activo
                          </span>
                          {isCurrentModule ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              <MapPin className="h-3.5 w-3.5" />
                              Estas aqui
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                          {activeModule.label}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                          {activeModule.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Resumen contextual
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Indicadores rapidos del modulo actual y del tipo de ayuda disponible.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 shadow-[0_8px_18px_rgba(37,99,235,0.05)]">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Layers3 className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                        Secciones
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {visibleSections.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Compass className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                        Contexto
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {contextualLabel}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-[0_8px_18px_rgba(99,102,241,0.05)]">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Info className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                        Ayuda contextual
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      Navega por procesos, pasos y material visual sin salir del dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {activeModule.id === 'dashboard' ? (
              <>
                <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      Bienvenida
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                      Centro de conocimiento para Matriz Inmobiliaria
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                      Consulta guias operativas, identifica rapidamente los modulos habilitados para tu sesion y entra a cada flujo con una vista mucho mas clara y contextual.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Resumen
                    </p>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-500">Modulos visibles</p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                          {dashboardCards.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                        <p className="text-sm font-medium text-blue-700">Modulo contextual</p>
                        <p className="mt-1 text-base font-semibold text-slate-950">
                          {dashboardCards.find((moduleItem) => moduleItem.id === currentRouteModuleId)?.label || 'Dashboard'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {dashboardCards.length ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {dashboardCards.map((moduleItem) => {
                      const CardIcon = moduleItem.icon;
                      const isRouteModule = moduleItem.id === currentRouteModuleId;

                      return (
                        <motion.button
                          key={moduleItem.id}
                          type="button"
                          onClick={() => onSelectModule(moduleItem.id)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.99 }}
                          className={`group overflow-hidden rounded-[28px] border p-5 text-left shadow-[0_16px_34px_rgba(15,23,42,0.05)] transition-all ${isRouteModule ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_22px_40px_rgba(15,23,42,0.07)]'}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${isRouteModule ? 'border-blue-100 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-700'}`}>
                              <CardIcon className="h-5 w-5" />
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {moduleItem.visibleSections.length} secciones
                              </span>
                              {isRouteModule ? (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                  Estas aqui
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <h4 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
                            {moduleItem.label}
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {moduleItem.shortDescription}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                    No hay modulos adicionales habilitados para este usuario en este momento.
                  </section>
                )}
              </>
            ) : visibleSections.length ? (
              <div className="space-y-4">
                {visibleSections.map((section) => (
                  <HelpSection
                    key={section.id}
                    section={section}
                    isMobile={isMobile}
                    isExpanded={expandedSectionId === section.id}
                    onToggle={() =>
                      setExpandedSectionId((currentValue) =>
                        currentValue === section.id ? null : section.id
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-[0_18px_36px_rgba(15,23,42,0.04)]">
                <p className="text-lg font-semibold tracking-tight text-slate-900">
                  Documentacion en progreso
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {activeModule.placeholderMessage || 'Este modulo aun no tiene secciones visibles para tu acceso actual.'}
                </p>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HelpContent;
