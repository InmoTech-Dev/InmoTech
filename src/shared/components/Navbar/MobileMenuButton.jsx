import React from 'react';
import { Menu, X } from 'lucide-react';

/**
 * Mobile menu toggle button component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the menu is open
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 */
const MobileMenuButton = ({ isOpen, onClick, className = '' }) => {
  return (
    <div className={`md:hidden ${className}`}>
      <button
        onClick={onClick}
        className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Toggle mobile menu"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>
    </div>
  );
};

export default MobileMenuButton;
