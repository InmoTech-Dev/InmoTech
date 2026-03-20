import React from 'react';

const FooterLogo = () => {
  return (
    <div className="flex flex-col items-center justify-start md:justify-start md:items-start space-y-0 md:pl-8 mt-[-35px]">
      <img
        src="/images/logo-matriz-sin-fondo.png"
        alt="Matriz Inmobiliaria Logo"
        className="h-52 w-52 sm:h-20 sm:w-20 md:h-56 md:w-56 object-contain flex-shrink-0"
      />
    </div>
  );
};

export default FooterLogo;
