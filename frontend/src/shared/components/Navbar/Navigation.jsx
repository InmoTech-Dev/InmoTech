import React from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/routes';

/**
 * Navigation links component
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onLinkClick - Callback when a link is clicked
 */
const Navigation = ({ className = '', onLinkClick }) => {
  const navItems = [
    { to: routes.landing || '/', label: 'Inicio' },
    { to: routes.about, label: 'Nosotros' },
    { to: routes.properties, label: 'Inmuebles' },
    { to: routes.services, label: 'Servicios' },
    { to: routes.contact, label: 'Contáctanos' }
  ];

  return (
    <div className={`hidden md:flex items-center space-x-8 ${className}`}>
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="text-white hover:text-blue-200 transition-colors font-medium"
          onClick={onLinkClick}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

export default Navigation;
