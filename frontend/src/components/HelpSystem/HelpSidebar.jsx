import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const pointPulse = {
  scale: [1, 1.18, 1],
  opacity: [0.6, 1, 0.6]
};

const HelpSidebar = ({ modules, activeModuleId, currentRouteModuleId, onSelect }) => {
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false
  });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;

    const updateScrollState = () => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      setScrollState({
        canScrollLeft: container.scrollLeft > 8,
        canScrollRight: maxScrollLeft - container.scrollLeft > 8
      });
    };

    updateScrollState();
    container.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [modules]);

  const scrollTabs = (direction) => {
    scrollRef.current?.scrollBy({
      left: direction * 320,
      behavior: 'smooth'
    });
  };

  return (
    <div className="border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Modulos disponibles
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Cambia de contexto sin salir del centro de ayuda.
          </p>
        </div>

        <span className="hidden rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-blue-700 sm:inline-flex">
          {modules.length} modulos
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          className={[
            'hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:inline-flex',
            scrollState.canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-35'
          ].join(' ')}
          aria-label="Ver modulos anteriores"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="help-tabs-viewport relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            className="help-module-tabs flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Modulos de ayuda"
          >
            {modules.map((moduleItem) => {
              const Icon = moduleItem.icon;
              const isActive = activeModuleId === moduleItem.id;
              const isCurrentRoute = currentRouteModuleId === moduleItem.id;

              return (
                <motion.button
                  key={moduleItem.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelect(moduleItem.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  className={[
                    'group relative inline-flex min-w-[220px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 sm:min-w-[240px]',
                    isActive
                      ? 'border-blue-200 bg-[linear-gradient(180deg,#eff6ff,#dbeafe)] text-blue-900 shadow-[0_12px_24px_rgba(37,99,235,0.10)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                      isActive
                        ? 'border-blue-200 bg-blue-600 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-700'
                    ].join(' ')}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isCurrentRoute ? (
                        <motion.span
                          className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                          animate={pointPulse}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="truncate text-sm font-semibold">{moduleItem.label}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                        ].join(' ')}
                      >
                        {moduleItem.visibleSections.length} secciones
                      </span>
                      {isCurrentRoute ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Estas aqui
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isActive ? (
                    <motion.span
                      layoutId="help-active-tab"
                      className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600"
                    />
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollTabs(1)}
          className={[
            'hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:inline-flex',
            scrollState.canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-35'
          ].join(' ')}
          aria-label="Ver mas modulos"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HelpSidebar;
