import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Info,
  PlayCircle
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';

const accordionTransition = { duration: 0.3, ease: 'easeInOut' };

const StepItem = ({ step, index }) => (
  <li className="help-step-item flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#60a5fa)] text-sm font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.18)]">
      {index + 1}
    </span>
    <span className="mt-1 shrink-0 text-blue-600" aria-hidden="true">
      <CheckCircle2 className="h-[18px] w-[18px]" />
    </span>
    <p className="text-sm leading-7 text-slate-700">{step}</p>
  </li>
);

const CardTitle = ({ icon: Icon, title, subtitle, tone = 'blue' }) => (
  <div className="mb-4 flex items-start gap-3">
    <div
      className={[
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
        tone === 'indigo'
          ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
          : tone === 'slate'
            ? 'border-slate-200 bg-slate-100 text-slate-700'
            : 'border-blue-100 bg-blue-50 text-blue-700'
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
    </div>
  </div>
);

const HelpSectionBody = ({ section, isMobile }) => (
  <div className="space-y-4">
    <div className="rounded-[22px] border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
      <CardTitle
        icon={Info}
        title="Resumen del proceso"
        subtitle="Identifica rapidamente de que trata esta accion antes de revisar los pasos."
        tone="blue"
      />
      <p className="text-sm leading-7 text-slate-700">{section.description}</p>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-5">
        <CardTitle
          icon={ClipboardList}
          title="Pasos"
          subtitle="Sigue la secuencia para completar la accion dentro del modulo."
          tone="slate"
        />

        <ul className="space-y-3">
          {section.steps.map((step, index) => (
            <StepItem key={`${section.id}-step-${index + 1}`} step={step} index={index} />
          ))}
        </ul>
      </div>

      <div className="rounded-[22px] border border-indigo-100 bg-indigo-50/40 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-5">
        <CardTitle
          icon={PlayCircle}
          title="Video tutorial"
          subtitle={
            isMobile
              ? 'Consulta el apoyo visual cuando lo necesites.'
              : 'Usa este recurso visual para reforzar el flujo del proceso.'
          }
          tone="indigo"
        />

        <VideoPlayer
          cloudinaryVideoUrl={section.cloudinaryVideoUrl}
          title={`Video tutorial de ${section.title}`}
        />
      </div>
    </div>
  </div>
);

const HelpSection = ({ section, isMobile, isExpanded, onToggle }) => (
  <motion.section
    layout
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
  >
    <div className="h-1.5 w-full bg-[linear-gradient(90deg,#93c5fd,#60a5fa,#4f46e5)]" />

    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left sm:px-5 sm:py-5"
      aria-expanded={isExpanded}
      aria-controls={`help-section-${section.id}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
            Seccion
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            {section.steps.length} pasos
          </span>
        </div>

        <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
          {section.title}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          {section.description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
          {isExpanded ? 'Minimizar' : 'Expandir'}
        </span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={accordionTransition}
          className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500"
        >
          <ChevronDown className="h-[18px] w-[18px]" />
        </motion.span>
      </div>
    </button>

    <AnimatePresence initial={false}>
      {isExpanded ? (
        <motion.div
          id={`help-section-${section.id}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={accordionTransition}
          className="overflow-hidden"
        >
          <div className="border-t border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
            <HelpSectionBody section={section} isMobile={isMobile} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  </motion.section>
);

export default HelpSection;
