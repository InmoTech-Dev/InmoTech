import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const TONE_STYLES = {
  primary: 'border-[#00457B]/15 bg-[#00457B]/[0.035] text-[#0B2545]',
  info: 'border-[#0EA5E9]/15 bg-[#0EA5E9]/[0.035] text-[#0B2545]',
  success: 'border-[#16A34A]/15 bg-[#16A34A]/[0.035] text-[#0B2545]',
  warning: 'border-[#F59E0B]/15 bg-[#F59E0B]/[0.035] text-[#0B2545]',
  danger: 'border-[#DC2626]/15 bg-[#DC2626]/[0.035] text-[#0B2545]',
  neutral: 'border-slate-200 bg-slate-50 text-[#0B2545]'
};

const KpiCard = ({ label, value, hint, tone = 'neutral' }) => {
  const prefersReducedMotion = useReducedMotion();
  const style = TONE_STYLES[tone] || TONE_STYLES.neutral;

  return (
    <motion.article
      whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.005 }}
      transition={{ duration: 0.18 }}
      className={`rounded-xl border p-4 ${style}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1 text-[#0B2545]">{value}</p>
      {hint ? <p className="text-xs mt-2 text-slate-600">{hint}</p> : null}
    </motion.article>
  );
};

export default KpiCard;
