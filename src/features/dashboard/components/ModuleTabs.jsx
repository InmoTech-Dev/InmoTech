import React from 'react';
import { motion } from 'framer-motion';
import { MODULE_META } from '../utils/dashboardConfig';

const ModuleTabs = ({ modules = [], activeTab, onChange }) => {
  if (!modules.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {modules.map((moduleKey) => {
          const meta = MODULE_META[moduleKey];
          if (!meta) return null;
          const Icon = meta.icon;
          const isActive = activeTab === moduleKey;

          return (
            <motion.button
              key={moduleKey}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.16 }}
              onClick={() => onChange(moduleKey)}
              className={[
                'relative inline-flex items-center gap-2 rounded-xl px-3 py-2 border text-sm whitespace-nowrap transition-colors',
                isActive
                  ? 'text-white border-transparent shadow-sm'
                  : 'text-slate-700 border-slate-200 hover:border-slate-300'
              ].join(' ')}
              style={isActive ? { backgroundColor: meta.accent } : undefined}
            >
              <Icon size={16} />
              <span className="font-medium">{meta.title}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default ModuleTabs;
