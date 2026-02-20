import React from 'react';
import { motion } from 'framer-motion';

const ModuleSection = ({ title, description, icon: Icon, error, accent = '#00457B', children }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm"
    >
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon ? (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${accent}1A`, color: accent }}
            >
              <Icon size={20} />
            </span>
          ) : null}
          <div>
            <h3 className="text-lg font-semibold text-[#0B2545]">{title}</h3>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-sm text-[#92400E]">
          {error}
        </div>
      ) : null}

      {!error ? (
        <div className="border-t border-slate-100 pt-4">
          {children}
        </div>
      ) : null}
    </motion.section>
  );
};

export default ModuleSection;
