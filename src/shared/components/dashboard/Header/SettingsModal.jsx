import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Configuración</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </motion.button>
              </div>
              <p className="text-slate-600">Aquí puedes ajustar la configuración de tu cuenta.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SettingsModal;