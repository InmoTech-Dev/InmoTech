import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { routes } from "@/routes";
import { ChevronDown, ChevronUp } from "lucide-react";

const FooterLinks = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickLinks = [
    { name: 'Inicio', path: routes.home },
    { name: 'Nosotros', path: routes.about },
    { name: 'Inmuebles', path: routes.properties },
    { name: 'Servicios', path: routes.services },
    { name: 'Contáctanos', path: routes.contact }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile: Collapsible Header */}
      <div className="block md:hidden pl-8">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-center focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-2"
        >
          <div className="flex-1 text-center">
            <h3 className="text-base font-bold inline-block">Enlaces Rápidos</h3>
            <div className="w-10 h-0.5 bg-[#60A5FA] mt-2 mx-auto"></div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-blue-300 ml-2" />
          ) : (
            <ChevronDown className="h-5 w-5 text-blue-300 ml-2" />
          )}
        </button>
      </div>

      {/* Desktop: Always visible header */}
      <div className="hidden md:block text-left pl-14">
        <h3 className="text-lg font-bold">Enlaces Rápidos</h3>
        <div className="w-12 h-0.5 bg-[#60A5FA] mt-2"></div>
      </div>
      {/* Desktop: Links */}
      <div className="hidden md:block pl-12">
        <nav className="pt-2 ">
          <ul className="space-y-2 sm:space-y-3 text-left" role="list">
            {quickLinks.map((link) => (
              <li key={link.name}>
                <Link
                  to={link.path}
                  className="text-blue-100 hover:text-white transition-all duration-300 text-sm relative group inline-block focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-1"
                >
                  {link.name}
                  <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#60A5FA] transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Links - Collapsible on mobile */}
      <div className={`md:block overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="pt-2">
          <ul className="space-y-2 sm:space-y-3 text-center md:text-left" role="list">
            {quickLinks.map((link, index) => (
              <li key={link.name} className={`transform transition-all duration-300 ${isExpanded ? 'translate-y-0' : 'translate-y-4'} delay-${index * 100}`}>
                <Link
                  to={link.path}
                  className="text-blue-100 transition-all duration-300 text-sm relative group inline-block focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-1 md:hover:text-white"
                >
                  {link.name}
                  <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-[#60A5FA] transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default FooterLinks;
