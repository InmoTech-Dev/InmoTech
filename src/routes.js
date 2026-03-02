export const routes = {
    home: '/',
    about: '/nosotros',
    services: '/servicios',
    properties: '/inmuebles',
    propertyDetails: '/inmuebles/:id',
    contact: '/contactanos',
    userAppointments: '/mis-citas',
    userProperties: '/mis-inmuebles',

    //Dashboard

  };
  
  export const navigationLinks = [
    { name: 'Inicio', path: routes.home },
    { name: 'Nosotros', path: routes.about },
    { name: 'Inmuebles', path: routes.properties },
    { name: 'Servicios', path: routes.services },
    { name: 'Contáctanos', path: routes.contact }
  ];
