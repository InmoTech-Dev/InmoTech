import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, ChevronDown, ChevronUp } from "lucide-react";

const FooterContact = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Dirección',
      content: ['Carrera 60 # 56-17, Antioquia,', 'Colombia']
    },
    {
      icon: Phone,
      title: 'Teléfono',
      content: ['+57 300 6814 959']
    },
    {
      icon: Mail,
      title: 'Email',
      content: ['matriz_inmobiliaria@gmail.com']
    },
    {
      icon: Clock,
      title: 'Horarios',
      content: ['Lunes - Sábado: 8:00 am - 1:00 pm', '2:00 pm - 5:00 pm']
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile: Collapsible Header */}
      <div className="block md:hidden pl-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-center focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-2"
        >
          <div className="flex-1">
            <h3 className="text-base font-bold">Información de Contacto</h3>
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
      <div className="hidden md:block text-left pl-28">
        <h3 className="text-lg font-bold">Información de Contacto</h3>
        <div className="w-12 h-0.5 bg-[#60A5FA] mt-2"></div>
      </div>
      {/* Desktop: Contact Info */}
      <div className="hidden md:block pt-2 space-y-3 sm:space-y-4 pl-28">
        {contactInfo.map((item, index) => (
          <div key={index} className="flex items-center space-x-4 group text-left">
            <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-300 flex-shrink-0 group-hover:text-[#60A5FA] transition-colors duration-300" />
            <div className="text-blue-100 text-xs sm:text-sm min-w-0 flex-1 ">
              <div className="font-medium text-white mb-1 text-left">{item.title}</div>
              {item.content.map((line, lineIndex) => (
                <div key={lineIndex} className="leading-relaxed">{line}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Info - Collapsible on mobile */}
      <div className={`md:block overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-3 sm:space-y-4 pt-2">
          {contactInfo.map((item, index) => (
            <div key={index} className={`flex flex-col items-center space-y-4 group text-center transform transition-all duration-300 ${isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} delay-${index * 100}`}>
              <div className="flex items-center space-x-2 justify-center">
                <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-300 flex-shrink-0 group-hover:text-[#60A5FA] transition-colors duration-300" />
                <div className="font-medium text-white">{item.title}</div>
              </div>
              <div className="text-blue-100 text-xs sm:text-sm min-w-0 pl-0">
                {item.content.map((line, lineIndex) => (
                  <div key={lineIndex} className="leading-relaxed">{line}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FooterContact;
