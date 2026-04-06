import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpenText, LifeBuoy, X } from 'lucide-react';
import { useAuth } from '../../shared/contexts/AuthContext';
import { HELP_MODULES } from './helpData';
import { filterModulesForUser, filterSectionsForUser } from './helpPermissions';
import HelpContent from './HelpContent';
import HelpSidebar from './HelpSidebar';
import { useHelp } from './useHelp';

const overlayTransition = { duration: 0.3 };
const panelTransition = { type: 'spring', stiffness: 300, damping: 30 };

const getFocusableElements = (container) => {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled'));
};

const getPanelSubtitle = (activeModule) => {
  if (!activeModule || activeModule.id === 'dashboard') {
    return 'Consulta guias y pasos segun el modulo que estas usando.';
  }

  return activeModule.shortDescription || 'Consulta ayuda rapida del modulo activo.';
};

const HelpPanel = () => {
  const { user } = useAuth();
  const {
    isOpen,
    activeModuleId,
    currentRouteModuleId,
    closeHelp,
    setActiveModule,
    goToDashboardHelp
  } = useHelp();
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  const visibleModules = useMemo(() => {
    const filteredModules = filterModulesForUser(HELP_MODULES, user);

    return filteredModules.map((moduleItem) => ({
      ...moduleItem,
      visibleSections: filterSectionsForUser(moduleItem.sections, user, moduleItem.id)
    }));
  }, [user]);

  const activeModule = useMemo(() => {
    const preferredModule =
      visibleModules.find((moduleItem) => moduleItem.id === activeModuleId) ||
      visibleModules.find((moduleItem) => moduleItem.id === 'dashboard') ||
      visibleModules[0] ||
      null;

    return preferredModule;
  }, [activeModuleId, visibleModules]);

  useEffect(() => {
    if (!isOpen || !activeModule) return;

    if (activeModule.id !== activeModuleId) {
      setActiveModule(activeModule.id);
    }
  }, [activeModule, activeModuleId, isOpen, setActiveModule]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 40);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHelp();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(panelRef.current);
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [closeHelp, isOpen]);

  if (typeof document === 'undefined') {
    return null;
  }

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[9999]">
          <motion.button
            type="button"
            aria-label="Cerrar ayuda virtual"
            className="absolute inset-0 h-full w-full cursor-default border-0 bg-[rgba(15,23,42,0.62)] p-0"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={overlayTransition}
            onClick={closeHelp}
          />

          <div className="pointer-events-none absolute inset-3 flex items-center justify-center md:inset-6">
            <motion.aside
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-panel-title"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={panelTransition}
              className="help-knowledge-shell pointer-events-auto relative flex h-full w-full max-w-[1120px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-[var(--help-surface)] shadow-[0_30px_90px_rgba(15,23,42,0.18)] md:h-auto md:max-h-[88vh]"
            >
              <header className="relative border-b border-slate-200/80 bg-white px-5 py-3.5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 shadow-[0_8px_18px_rgba(37,99,235,0.08)]">
                        <BookOpenText className="h-[18px] w-[18px]" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                          Centro de ayuda
                        </p>
                        <h1
                          id="help-panel-title"
                          className="mt-0.5 text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.4rem]"
                        >
                          Ayuda virtual
                        </h1>
                        <p className="mt-0.5 max-w-2xl text-[13px] leading-5 text-slate-600 sm:text-sm">
                          {getPanelSubtitle(activeModule)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 lg:inline-flex">
                      <LifeBuoy className="h-4 w-4 text-blue-600" />
                      Soporte contextual
                    </span>

                    <motion.button
                      ref={closeButtonRef}
                      type="button"
                      onClick={closeHelp}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Cerrar ayuda virtual"
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </header>

              <HelpSidebar
                modules={visibleModules}
                activeModuleId={activeModule?.id}
                currentRouteModuleId={currentRouteModuleId}
                onSelect={setActiveModule}
              />

              <HelpContent
                activeModule={activeModule}
                visibleModules={visibleModules}
                currentRouteModuleId={currentRouteModuleId}
                onBackToDashboard={goToDashboardHelp}
                onSelectModule={setActiveModule}
              />

              <footer className="border-t border-slate-200/80 bg-white px-5 py-4 text-sm text-slate-500 sm:px-7">
                Necesitas mas ayuda? Contacta a soporte.
              </footer>
            </motion.aside>
          </div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

export default HelpPanel;
