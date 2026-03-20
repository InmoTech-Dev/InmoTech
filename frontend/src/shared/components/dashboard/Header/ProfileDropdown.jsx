import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardRoutes } from '../../../../routes/index';

const ProfileDropdown = ({ isOpen, onClose, triggerRef, onOpenSettings, userFullName, userRole, userInitial, userAvatar }) => {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const updatePosition = () => {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          left: rect.right - 280, // w-72 = 280px
        });
        setIsPositioned(true);
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
        setIsPositioned(false);
      };
    } else {
      setIsPositioned(false);
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !isPositioned) return null;

  const dropdownContent = (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: '280px',
        }}
        className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/60 z-[10000] overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold flex items-center justify-center uppercase text-base shadow-md overflow-hidden">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userFullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                userInitial
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 truncate">{userFullName}</p>
              <p className="text-xs text-slate-500">{userRole}</p>
            </div>
          </div>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => {
              navigate(dashboardRoutes.profile);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Mi Perfil</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return ReactDOM.createPortal(dropdownContent, document.body);
};

export default ProfileDropdown;
