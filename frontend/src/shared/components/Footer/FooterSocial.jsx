import React from 'react';
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa';

const FooterSocial = () => {
  const socialLinks = [
    {
      name: 'Facebook',
      href: '#',
      icon: FaFacebookF,
      baseColor: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
      hoverShadow: 'hover:shadow-blue-500/50',
    },
    {
      name: 'Instagram',
      href: '#',
      icon: FaInstagram,
      baseColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400',
      hoverColor: 'hover:from-purple-600 hover:via-pink-600 hover:to-orange-500',
      hoverShadow: 'hover:shadow-pink-500/50',
    },
    {
      name: 'TikTok',
      href: '#',
      icon: FaTiktok,
      baseColor: 'bg-black',
      hoverColor: 'hover:bg-gray-900',
      hoverShadow: 'hover:shadow-black/50',
    },
    {
      name: 'WhatsApp',
      href: '#',
      icon: FaWhatsapp,
      baseColor: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      hoverShadow: 'hover:shadow-green-500/50',
    },
  ];

  return (
    <div className="flex flex-col items-center md:items-start space-y-4">
      <h3 className="text-lg font-semibold text-white mb-2">Síguenos en redes sociales</h3>
      <div className="flex justify-center md:justify-start gap-4">
        {socialLinks.map((social) => (
          <a
            key={social.name}
            href={social.href}
            className={`group relative w-12 h-12 ${social.baseColor} ${social.hoverColor} rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 ${social.hoverShadow} hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#00457B] overflow-hidden`}
            aria-label={`Visitar ${social.name}`}
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>

            {/* Icon with bounce animation */}
            <social.icon className="h-4 w-4 text-white relative z-10 group-hover:animate-bounce transition-transform duration-300" />

            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full border-2 border-white/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default FooterSocial;
