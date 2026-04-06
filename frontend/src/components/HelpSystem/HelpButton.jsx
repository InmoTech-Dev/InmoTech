import React from 'react';
import { motion } from 'framer-motion';
import { CircleHelp, Sparkles } from 'lucide-react';
import HelpPanel from './HelpPanel';
import { useHelp } from './useHelp';

const HelpButton = () => {
  const { isOpen, openHelp, hasBeenOpenedThisSession, triggerRef } = useHelp();

  return (
    <>
      <motion.button
        ref={triggerRef}
        type="button"
        aria-label="Abrir ayuda virtual"
        onClick={() => openHelp()}
        animate={
          !hasBeenOpenedThisSession && !isOpen
            ? { scale: [1, 1.05, 1] }
            : { scale: 1 }
        }
        transition={
          !hasBeenOpenedThisSession && !isOpen
            ? { duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-4 right-4 z-[9998] inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-200/70 bg-[linear-gradient(135deg,#2563eb,#3b82f6)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.24)] md:bottom-6 md:right-6 md:h-auto md:w-auto md:rounded-full md:px-4 md:py-3"
      >
        <span className="flex items-center justify-center md:mr-3">
          <CircleHelp className="h-5 w-5" />
        </span>
        <span className="hidden items-center gap-2 md:inline-flex">
          <span className="text-sm font-semibold tracking-tight">Ayuda</span>
          {!hasBeenOpenedThisSession ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-1 text-[11px] font-medium text-blue-50">
              <Sparkles className="h-3.5 w-3.5" />
              Nuevo
            </span>
          ) : null}
        </span>
      </motion.button>

      <HelpPanel />
    </>
  );
};

export default HelpButton;
