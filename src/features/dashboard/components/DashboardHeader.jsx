import React from 'react';
import { motion } from 'framer-motion';
import { MdRefresh, MdAccessTime } from 'react-icons/md';
import { DASHBOARD_RANGE_OPTIONS } from '../utils/dashboardConfig';
import { formatDateTime } from '../utils/dashboardFormatters';

const DashboardHeader = ({
  userName,
  range,
  onRangeChange,
  onRefresh,
  loading,
  generatedAt
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-[#0B2545]">
            Dashboard Administrativo
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Hola {userName || 'equipo'}, aqui tienes el estado operativo de hoy.
          </p>
          <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
            <MdAccessTime />
            Actualizado: {formatDateTime(generatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DASHBOARD_RANGE_OPTIONS.map((option) => {
            const active = option.value === range;
            return (
              <button
                key={option.value}
                type="button"
                disabled={loading}
                onClick={() => onRangeChange(option.value)}
                className={[
                  'px-3 py-2 text-sm rounded-full border transition-all duration-200',
                  active
                    ? 'bg-[#00457B] text-white border-[#00457B]'
                    : 'border-slate-300 text-slate-700 hover:border-[#00457B] hover:text-[#00457B]'
                ].join(' ')}
              >
                {option.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-full border border-slate-300 text-slate-700 hover:border-[#00457B] hover:text-[#00457B] transition-all duration-200"
          >
            <MdRefresh className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>
    </motion.section>
  );
};

export default DashboardHeader;
