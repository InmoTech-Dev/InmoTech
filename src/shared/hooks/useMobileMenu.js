import { useState } from 'react';

/**
 * Custom hook for managing mobile menu state
 * @returns {Object} Mobile menu state and handlers
 */
export const useMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    open,
    close,
    toggle
  };
};
