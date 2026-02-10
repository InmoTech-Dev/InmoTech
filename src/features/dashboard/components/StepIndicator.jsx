import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const StepIndicator = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.number} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted ? '#10b981' : isCurrent ? '#3b82f6' : '#e2e8f0',
                  scale: isCurrent ? 1.1 : 1
                }}
                transition={{ duration: 0.3 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted ? 'text-white' : isCurrent ? 'text-white' : 'text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </motion.div>
              <span className={`text-xs mt-2 font-medium ${
                isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'
              }`}>
                {step.title}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted ? '#10b981' : '#e2e8f0'
                }}
                transition={{ duration: 0.3 }}
                className="h-0.5 w-16 mx-4 mt-[-20px]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;