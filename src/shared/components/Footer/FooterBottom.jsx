import React from 'react';

const FooterBottom = () => {
  return (
    <div className="border-t border-blue-600/50 mt-8 sm:mt-12 pt-6 sm:pt-8">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <div className="text-blue-100 text-xs sm:text-sm text-center sm:text-left">
          © {new Date().getFullYear()} Matriz Inmobiliaria. Todos los derechos reservados.
        </div>
        <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6">
          <a
            href="#terminos"
            className="text-blue-100 hover:text-white transition-colors duration-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-1"
          >
            Términos y Condiciones
          </a>
          <a
            href="#privacidad"
            className="text-blue-100 hover:text-white transition-colors duration-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-1"
          >
            Política de Privacidad
          </a>
        </div>
      </div>
    </div>
  );
};

export default FooterBottom;
