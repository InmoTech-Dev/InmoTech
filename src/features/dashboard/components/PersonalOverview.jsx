import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import KpiCard from './KpiCard';

const PersonalOverview = ({ personal, quickActions }) => {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm"
    >
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-[#0B2545]">Vista personal</h2>
        <p className="text-sm text-slate-600">
          Resumen rapido de tu jornada y accesos directos.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KpiCard
          label="Pendientes asignados"
          value={personal?.pendientesUsuario ?? 0}
          tone="warning"
          hint="Citas por gestionar"
        />AC
        <KpiCard
          label="No leidas"
          value={personal?.notificacionesNoLeidas ?? 0}
          tone="info"
          hint="Notificaciones del sistema"
        />
        <KpiCard
          label="Agenda de hoy"
          value={(personal?.agendaHoy || []).length}
          tone="primary"
          hint="Compromisos del dia"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">Acciones rapidas</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(quickActions || []).slice(0, 6).map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => navigate(action.to)}
              className="text-left rounded-lg border border-slate-200 p-3 hover:border-[#00457B] hover:bg-[#00457B]/5 transition-colors"
            >
              <p className="text-sm font-medium text-[#0B2545]">{action.label}</p>
              <p className="text-xs text-slate-600 mt-1">{action.description}</p>
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default PersonalOverview;
