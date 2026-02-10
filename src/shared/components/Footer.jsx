import React from 'react';
import FooterLogo from './Footer/FooterLogo';
import FooterSocial from './Footer/FooterSocial';
import FooterLinks from './Footer/FooterLinks';
import FooterContact from './Footer/FooterContact';
import FooterBottom from './Footer/FooterBottom';

const Footer = () => {
  return (
    <footer className="bg-[#00457B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 ">
        {/* Mobile Layout - Compact and organized */}
        <div className="block md:hidden space-y-6">
          {/* Company Info Section */}
          <div className="text-center space-y-0">
            <FooterLogo />
            <p className="text-white text-base leading-6 max-w-md mx-auto mt-0 mb-6 relative -top-6">
              Somos una inmobiliaria comprometida con brindar el mejor servicio y asesoramiento en la compra, venta y alquiler de propiedades.
            </p>
            <FooterSocial />
          </div>

          {/* Collapsible sections for better organization */}
          <div className="space-y-4">
            <FooterLinks />
            <FooterContact />
          </div>
        </div>

        {/* Tablet and Desktop Layout - Side by side */}
        <div className="hidden md:grid md:grid-cols-12 gap-8 lg:gap-12 ">
          <div className="md:col-span-4 lg:col-span-4">
            <div className="mb-2">
              <FooterLogo />
            </div>
            <p className="text-white text-base leading-6 max-w-xs -mt-10 mb-10">
              Somos una inmobiliaria comprometida con brindar el mejor servicio y asesoramiento en la compra, venta y alquiler de propiedades.
            </p>
            <div className="mt-4">
              <FooterSocial />
            </div>
          </div>
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <FooterLinks />
          </div>
          <div className="md:col-span-4 lg:col-span-5 space-y-6">
            <FooterContact />
          </div>
        </div>

        <FooterBottom />
      </div>
    </footer>
  );
};

export default Footer;
