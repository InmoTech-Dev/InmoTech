import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Logo component for the navbar
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 */
const Logo = ({ className = '' }) => {
  return (
    <div className={`flex-1 md:flex-none flex justify-center md:justify-start mt-2 md:mt-2 ml-4 md:ml-0 ${className}`}>
      <Link to="/" className="flex items-center space-x-2">
        <img
          src="/images/logo-matriz-sin-fondo.png"
          alt="Matriz Inmobiliaria"
          className="h-44 md:h-44 w-auto"
        />
      </Link>
    </div>
  );
};

export default Logo;
