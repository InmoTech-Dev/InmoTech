import React from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const StepItem = ({ label, description, icon: Icon, index, isActive, isCompleted }) => {
  const stateColor = isActive ? '#2563EB' : isCompleted ? '#2DD4BF' : '#E2E8F0';
  const bgColor = isActive ? '#2563EB' : isCompleted ? '#E0F2FE' : '#FFFFFF';
  const iconColor = isActive ? '#FFFFFF' : isCompleted ? '#0F172A' : '#94A3B8';

  return (
    <div className="flex-1 flex flex-col items-center text-center px-2">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full border"
        style={{
          borderColor: stateColor,
          backgroundColor: bgColor,
          boxShadow: isActive ? '0 8px 16px rgba(37,99,235,0.25)' : 'none'
        }}
      >
        {Icon ? <Icon className="w-5 h-5" style={{ color: iconColor }} /> : (
          <span className="text-sm font-semibold" style={{ color: iconColor }}>
            {index + 1}
          </span>
        )}
      </div>
      <p className={`mt-2 text-sm font-semibold ${isActive ? 'text-slate-900' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
        {label}
      </p>
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-[140px] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
};

export const WizardModalLayout = ({
  isOpen,
  onClose,
  title,
  subtitle,
  steps = [],
  activeStep = 0,
  children,
  footer
}) => {
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-5xl mx-4 max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200 bg-white">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
                {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {steps.length > 0 && (
              <div className="px-6 py-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  {steps.map((step, index) => (
                    <React.Fragment key={step.label || step.title || index}>
                      <StepItem
                        {...step}
                        index={index}
                        isActive={index === activeStep}
                        isCompleted={index < activeStep}
                      />
                      {index < steps.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mt-5 ${index < activeStep ? 'bg-emerald-400' : 'bg-slate-200'}`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              <div className="max-w-4xl mx-auto space-y-6">{children}</div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-5">{footer}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
