import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileText,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users
} from 'lucide-react';

export const HELP_MODULE_ORDER = [
  'dashboard',
  'inmuebles',
  'propietarios',
  'citas',
  'ventas',
  'comprador',
  'arriendos',
  'arrendatario',
  'reportes',
  'usuarios',
  'administrativos',
  'roles'
];

// Nota para el equipo:
// 1. Agrega nuevas secciones dentro del arreglo `sections` del modulo correspondiente.
// 2. Usa `requiredAction` con acciones del sistema de ayuda: view, create, edit, delete, changeStatus, download, assign.
// 3. Para videos, pega la delivery URL de Cloudinary en `cloudinaryVideoUrl`.
// 4. Los modulos scaffold pueden completarse sin tocar componentes; solo editen este archivo.
export const HELP_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortDescription: 'Resumen general de los modulos disponibles para tu acceso actual.',
    description: 'Bienvenido a Matriz Inmobiliaria. Este es tu panel principal. Desde aqui tienes acceso rapido a todos los modulos habilitados para tu rol.',
    icon: LayoutDashboard,
    routePatterns: ['/dashboard'],
    parentPermissionModule: 'dashboard',
    requiredAccess: { module: 'dashboard', action: 'view' },
    sections: [],
    cloudinaryVideoUrl: null,
    placeholderMessage: null
  },
  {
    id: 'inmuebles',
    label: 'Gestion de Inmuebles',
    shortDescription: 'Consulta la guia base del modulo de inmuebles.',
    description: 'Modulo pendiente de documentacion. Tu companero completara el contenido de este modulo.',
    icon: Building2,
    routePatterns: ['/inmuebles/gestion'],
    parentPermissionModule: 'inmuebles',
    requiredAccess: { module: 'inmuebles', action: 'view' },
    sections: [],
    cloudinaryVideoUrl: null,
    placeholderMessage: 'Contenido en construccion -- proximamente disponible.'
  },
  {
    id: 'propietarios',
    label: 'Gestion de Propietarios',
    shortDescription: 'Estructura lista para documentar la gestion de propietarios.',
    description: 'Modulo pendiente de documentacion. Tu companero completara el contenido de este modulo.',
    icon: UserRound,
    routePatterns: ['/inmuebles/propietarios'],
    parentPermissionModule: 'inmuebles',
    requiredAccess: { module: 'inmuebles', action: 'view' },
    sections: [],
    cloudinaryVideoUrl: null,
    placeholderMessage: 'Contenido en construccion -- proximamente disponible.'
  },
  {
    id: 'citas',
    label: 'Gestion de Citas',
    shortDescription: 'Programa, consulta y administra citas y solicitudes.',
    description: 'Centraliza la programacion de visitas y servicios inmobiliarios mediante un calendario interactivo. Gestiona el ciclo completo de las citas: desde su solicitud hasta su completacion.',
    icon: CalendarDays,
    routePatterns: ['/dashboard/citas'],
    parentPermissionModule: 'citas',
    requiredAccess: { module: 'citas', action: 'view' },
    sections: [
      {
        id: 'listar-citas',
        title: 'Listar Citas',
        description: 'Visualiza el calendario mensual con todas las citas y sus estados mediante colores.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Accede al modulo Citas desde el menu lateral.',
          'El calendario mensual mostrara todas las citas con indicadores de color segun su estado.',
          'Usa las flechas de navegacion para moverte entre meses.'
        ]
      },
      {
        id: 'consultar-cita',
        title: 'Consultar Cita',
        description: 'Busca una cita por nombre del cliente, propiedad o correo.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ubica el campo de busqueda en la parte superior del modulo.',
          'Ingresa el nombre del cliente, propiedad o correo electronico.',
          'Revisa los resultados en el calendario o listado.'
        ]
      },
      {
        id: 'filtrar-citas',
        title: 'Filtrar Citas',
        description: 'Filtra citas por estado, por el dia actual o por solicitudes pendientes.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Usa el selector de estado en la barra superior para cambiar la vista.',
          'Presiona Citas de hoy para ver solo las citas del dia actual.',
          'Presiona Ver Solicitadas para ver solicitudes pendientes de confirmacion.'
        ]
      },
      {
        id: 'crear-cita',
        title: 'Crear Cita',
        description: 'Programa una nueva cita mediante un formulario guiado de 4 pasos.',
        requiredAction: 'create',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el boton + Nueva Cita en la parte superior derecha.',
          'Paso 1 - Cliente: completa los datos del cliente.',
          'Paso 2 - Servicio: selecciona el servicio, el inmueble y agrega notas si es necesario.',
          'Paso 3 - Fecha y Hora: selecciona la fecha y hora de la cita.',
          'Paso 4 - Resumen: revisa todos los datos y presiona Crear Cita.'
        ]
      },
      {
        id: 'detalle-cita',
        title: 'Ver Detalle de la Cita',
        description: 'Consulta toda la informacion de una cita: cliente, servicio, fecha, agente y estado.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona sobre una cita en el calendario o en el listado.',
          'Se abrira la ventana con el detalle completo de la cita.'
        ]
      },
      {
        id: 'editar-cita',
        title: 'Editar Cita',
        description: 'Modifica los datos de una cita ya registrada.',
        requiredAction: 'edit',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el icono de editar en el calendario o listado.',
          'Modifica los datos del cliente, servicio, inmueble, fecha y hora que necesites.',
          'Presiona Guardar Cambios para confirmar la actualizacion.'
        ]
      },
      {
        id: 'estado-cita',
        title: 'Cambiar Estado de la Cita',
        description: 'Actualiza el estado segun el ciclo de la cita.',
        requiredAction: 'changeStatus',
        cloudinaryVideoUrl: null,
        steps: [
          'Ubica la cita en el calendario o listado.',
          'Presiona el selector de estado.',
          'Selecciona el nuevo estado permitido segun el flujo actual.',
          'El sistema controla automaticamente las transiciones validas entre estados.'
        ]
      },
      {
        id: 'asignar-agente',
        title: 'Asignar Agente',
        description: 'Asigna el agente responsable de atender una cita.',
        requiredAction: 'assign',
        cloudinaryVideoUrl: null,
        steps: [
          'Abre el detalle de la cita o localizala en el listado.',
          'Presiona la opcion Asignar Agente.',
          'En el modal, selecciona el agente disponible y agrega una nota si aplica.',
          'Presiona Asignar para confirmar.'
        ]
      },
      {
        id: 'notificaciones-citas',
        title: 'Centro de Notificaciones de Citas',
        description: 'Gestiona solicitudes entrantes en tiempo real desde la campana superior.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el icono de notificaciones en la barra superior.',
          'Revisa las solicitudes pendientes con cliente, servicio, inmueble, fecha y hora.',
          'Usa Ver para abrir el detalle completo de la cita solicitada.',
          'Usa Aceptar o Rechazar para confirmar la accion desde el centro de notificaciones.'
        ]
      }
    ],
    cloudinaryVideoUrl: null,
    placeholderMessage: null
  },
  {
    id: 'ventas',
    label: 'Gestion de Ventas',
    shortDescription: 'Estructura lista para documentar la gestion comercial de ventas.',
    description: 'Modulo pendiente de documentacion. Tu companero completara el contenido de este modulo.',
    icon: TrendingUp,
    routePatterns: ['/dashboard/salesManagement'],
    parentPermissionModule: 'ventas',
    requiredAccess: { module: 'ventas', action: 'view' },
    sections: [],
    cloudinaryVideoUrl: null,
    placeholderMessage: 'Contenido en construccion -- proximamente disponible.'
  },
  {
    id: 'comprador',
    label: 'Gestion de Comprador',
    shortDescription: 'Estructura lista para documentar la gestion de compradores.',
    description: 'Modulo pendiente de documentacion. Tu companero completara el contenido de este modulo.',
    icon: UserRound,
    routePatterns: ['/dashboard/buyersManagement'],
    parentPermissionModule: 'ventas',
    requiredAccess: { module: 'ventas', action: 'view' },
    sections: [],
    cloudinaryVideoUrl: null,
    placeholderMessage: 'Contenido en construccion -- proximamente disponible.'
  },
  {
    id: 'arriendos',
    label: 'Gestion de Arriendos',
    shortDescription: 'Estructura lista para documentar la operacion de arriendos.',
    description: 'Modulo pendiente de documentacion. Tu companero completara el contenido de este modulo.',
    icon: KeyRound,
    routePatterns: ['/dashboard/renantManagement'],
    parentPermissionModule: 'arriendos',
    requiredAccess: { module: 'arriendos', action: 'view' },
    sections: [],
    cloudinaryVideoUrl: null,
    placeholderMessage: 'Contenido en construccion -- proximamente disponible.'
  },
  {
    id: 'arrendatario',
    label: 'Gestion de Arrendatario',
    shortDescription: 'Estructura lista para documentar la gestion de arrendatarios.',
    description: 'Modulo pendiente de documentacion. Tu companero completara el contenido de este modulo.',
    icon: UserRound,
    routePatterns: ['/dashboard/leasesManagement'],
    parentPermissionModule: 'arriendos',
    requiredAccess: { module: 'arriendos', action: 'view' },
    sections: [],
    cloudinaryVideoUrl: null,
    placeholderMessage: 'Contenido en construccion -- proximamente disponible.'
  },
  {
    id: 'reportes',
    label: 'Reportes Inmobiliarios',
    shortDescription: 'Consulta, seguimiento y descarga de reportes del negocio.',
    description: 'Centraliza el control de proyectos inmobiliarios: registro, consulta, edicion, seguimiento financiero, notificaciones y descarga de reportes.',
    icon: FileText,
    routePatterns: ['/reportes/gestion'],
    parentPermissionModule: 'reportes',
    requiredAccess: { module: 'reportes', action: 'view' },
    sections: [
      {
        id: 'listar-personal-reportes',
        title: 'Listar Personal a Cargo',
        description: 'Muestra el listado del personal responsable. Debes seleccionar uno para ver sus reportes.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Accede a Reportes Inmobiliarios desde el menu lateral.',
          'Se mostrara el listado de personal responsable de proyectos.',
          'Selecciona un responsable para ver los reportes bajo su gestion.'
        ]
      },
      {
        id: 'listar-reportes',
        title: 'Listar Reportes',
        description: 'Tabla con todos los reportes: codigo, inmueble, responsable, cliente, fecha y estado.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Tras seleccionar el personal, visualiza la tabla de reportes.'
        ]
      },
      {
        id: 'buscar-reporte',
        title: 'Buscar Reporte',
        description: 'Localiza un reporte por codigo, inmueble, cliente o responsable.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ingresa el termino de busqueda en el campo de la parte superior de la tabla.',
          'Los resultados se filtran en tiempo real.'
        ]
      },
      {
        id: 'filtrar-reportes',
        title: 'Filtrar Reportes',
        description: 'Refina resultados por estado, rango de fechas o responsable.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Usa los filtros disponibles en la parte superior: estado, fechas o responsable.',
          'Los resultados se actualizaran automaticamente.'
        ]
      },
      {
        id: 'registrar-reporte',
        title: 'Registrar Reporte',
        description: 'Crea un nuevo reporte de proyecto inmobiliario.',
        requiredAction: 'create',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el boton Nuevo Reporte.',
          'Completa el formulario con datos del inmueble, responsable y descripcion del proyecto.',
          'Presiona Crear Reporte para registrar el nuevo reporte.'
        ]
      },
      {
        id: 'detalle-reporte',
        title: 'Ver Detalle del Reporte',
        description: 'Consulta informacion completa del reporte, observaciones, galeria y rubros.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona sobre el reporte en la tabla principal.',
          'Se mostrara la tarjeta del reporte con informacion resumida.',
          'Presiona sobre la tarjeta para ver el detalle completo.'
        ]
      },
      {
        id: 'editar-reporte',
        title: 'Editar Reporte',
        description: 'Modifica la informacion de un reporte existente.',
        requiredAction: 'edit',
        cloudinaryVideoUrl: null,
        steps: [
          'Abre el detalle del reporte.',
          'Dentro del detalle, presiona el boton Editar.',
          'Actualiza la informacion necesaria en el formulario.',
          'Presiona Guardar para confirmar los cambios.'
        ]
      },
      {
        id: 'estado-reporte',
        title: 'Cambiar Estado del Reporte',
        description: 'Actualiza el estado segun el avance del proyecto.',
        requiredAction: 'changeStatus',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el selector de estado del reporte.',
          'El sistema mostrara un modal de confirmacion.',
          'Confirma el cambio de estado.'
        ]
      },
      {
        id: 'descargar-lista-reportes',
        title: 'Descargar Lista de Reportes',
        description: 'Exporta el listado completo en formato PDF o Excel.',
        requiredAction: 'download',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el boton de descarga en la parte superior de la tabla.',
          'Selecciona el formato deseado: PDF o Excel.',
          'El archivo se descargara automaticamente.'
        ]
      },
      {
        id: 'descargar-reporte-individual',
        title: 'Descargar Reporte Individual',
        description: 'Descarga un reporte especifico en PDF desde su detalle.',
        requiredAction: 'download',
        cloudinaryVideoUrl: null,
        steps: [
          'Abre el detalle del reporte.',
          'Presiona el boton Descargar PDF.',
          'El archivo del reporte se descargara automaticamente.'
        ]
      },
      {
        id: 'gestion-rubros',
        title: 'Gestion de Rubros',
        description: 'Registra y controla los rubros financieros del proyecto.',
        requiredAction: ['view', 'create'],
        cloudinaryVideoUrl: null,
        steps: [
          'Dentro del detalle del reporte, accede a la seccion de Seguimiento.',
          'Visualiza la tabla de rubros con descripcion, valor presupuestado, valor ejecutado y estado.',
          'Presiona Nuevo Rubro para crear uno nuevo y completa descripcion, valor y categoria.',
          'Usa Anular en el rubro correspondiente si necesitas dejarlo inactivo en el historial.'
        ]
      },
      {
        id: 'gestion-seguimientos',
        title: 'Gestion de Seguimientos',
        description: 'Registra actividades del proyecto con fecha, descripcion y estado.',
        requiredAction: ['view', 'create'],
        cloudinaryVideoUrl: null,
        steps: [
          'Dentro del detalle del reporte, visualiza la tabla de seguimientos.',
          'Presiona Nuevo Seguimiento para registrar una actividad con fecha, descripcion y responsable.',
          'Cambia el estado del seguimiento desde el selector de la tabla.',
          'Usa Anular para dejar el seguimiento inactivo en el historial.'
        ]
      },
      {
        id: 'notificaciones-reportes',
        title: 'Notificaciones de Reporte',
        description: 'Visualiza notificaciones asociadas a reportes segun tu rol.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el icono de notificaciones en la barra superior.',
          'Selecciona la pestana Reportes en el centro de notificaciones.',
          'Visualiza las notificaciones con tipo, fecha y descripcion segun tu perfil.'
        ]
      }
    ],
    cloudinaryVideoUrl: null,
    placeholderMessage: null
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    shortDescription: 'Gestion centralizada de usuarios, estados e invitaciones.',
    description: 'Gestiona los registros de usuarios del sistema. Controla su acceso, estado y datos personales desde un panel centralizado.',
    icon: Users,
    routePatterns: ['/seguridad/usuarios'],
    parentPermissionModule: 'usuarios',
    requiredAccess: { module: 'usuarios', action: 'view' },
    sections: [
      {
        id: 'listar-usuarios',
        title: 'Listar Usuarios',
        description: 'Visualiza la tabla con todos los usuarios registrados.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Accede a Seguridad -> Usuarios desde el menu lateral.',
          'La tabla mostrara todos los usuarios con su estado y acciones disponibles.'
        ]
      },
      {
        id: 'consultar-usuario',
        title: 'Consultar Usuario',
        description: 'Localiza un usuario por nombre, correo o numero de documento.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ubica el campo de busqueda en la parte superior de la tabla.',
          'Ingresa el nombre, correo electronico o numero de documento del usuario.',
          'Revisa los resultados en la tabla.'
        ]
      },
      {
        id: 'filtrar-usuarios',
        title: 'Filtrar Usuarios',
        description: 'Filtra usuarios por estado de cuenta o estado de acceso.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ubica los selectores de filtro en la parte superior de la tabla.',
          'Selecciona el estado de cuenta o estado de acceso deseado.',
          'La tabla se actualizara con los resultados filtrados.'
        ]
      },
      {
        id: 'registrar-usuario',
        title: 'Registrar Usuario',
        description: 'Crea un nuevo usuario en el sistema con sus datos personales.',
        requiredAction: 'create',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el boton Nuevo Usuario en la parte superior derecha.',
          'Completa tipo de documento, numero de documento, nombre, apellido, correo y telefono.',
          'Presiona Crear Usuario para registrar el nuevo usuario.',
          'Si hay campos invalidos, el boton quedara deshabilitado y se mostraran errores bajo cada campo.'
        ]
      },
      {
        id: 'detalle-usuario',
        title: 'Ver Detalle del Usuario',
        description: 'Consulta la informacion completa del usuario y el estado de su cuenta.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de ver detalle.',
          'Se abrira una ventana con la informacion completa del usuario.'
        ]
      },
      {
        id: 'editar-usuario',
        title: 'Editar Usuario',
        description: 'Modifica los datos personales de un usuario registrado.',
        requiredAction: 'edit',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de editar.',
          'Se abrira el formulario con la informacion actual del usuario.',
          'Realiza los cambios necesarios y presiona Guardar Usuario.',
          'Confirma en el modal de confirmacion para finalizar la actualizacion.'
        ]
      },
      {
        id: 'reenviar-invitacion',
        title: 'Reenviar Invitacion',
        description: 'Reenvia el correo de activacion a usuarios pendientes.',
        requiredAction: 'edit',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de reenviar invitacion.',
          'El sistema enviara el correo automaticamente.',
          'Verifica la confirmacion en pantalla cuando el reenvio termine.'
        ]
      },
      {
        id: 'estado-usuario',
        title: 'Cambiar Estado del Usuario',
        description: 'Habilita o deshabilita el acceso de un usuario.',
        requiredAction: 'changeStatus',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, ubica el selector de estado del usuario.',
          'Selecciona Habilitado o Deshabilitado.',
          'El cambio se aplica de inmediato y afecta el acceso al sistema.'
        ]
      }
    ],
    cloudinaryVideoUrl: null,
    placeholderMessage: null
  },
  {
    id: 'administrativos',
    label: 'Administrativos',
    shortDescription: 'Registro, seguimiento laboral y acceso del personal administrativo.',
    description: 'Administra los perfiles del personal con privilegios de gestion dentro del sistema. Desde aqui se registra y gestiona a los administrativos de la plataforma.',
    icon: BriefcaseBusiness,
    routePatterns: ['/seguridad/administrativos'],
    parentPermissionModule: 'administrativos',
    requiredAccess: { module: 'administrativos', action: 'view' },
    sections: [
      {
        id: 'listar-administrativos',
        title: 'Listar Administrativos',
        description: 'Visualiza todos los administrativos con su estado laboral y fecha de ingreso.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Accede a Seguridad -> Administrativos desde el menu lateral.',
          'La tabla mostrara todos los administrativos registrados.'
        ]
      },
      {
        id: 'consultar-administrativo',
        title: 'Consultar Administrativo',
        description: 'Localiza un administrativo por nombre, correo o codigo de empleado.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ingresa el texto en el campo de busqueda por nombre, email o codigo.',
          'Revisa los resultados filtrados en la tabla.'
        ]
      },
      {
        id: 'filtrar-administrativos',
        title: 'Filtrar Administrativos',
        description: 'Filtra administrativos por estado, rol o perfil asignado.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Selecciona los filtros disponibles: estado, rol o perfil.',
          'La tabla se actualizara con los resultados.'
        ]
      },
      {
        id: 'registrar-administrativo',
        title: 'Registrar Administrativo',
        description: 'Crea un nuevo administrativo mediante un formulario de 4 pasos.',
        requiredAction: 'create',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el boton + Nuevo Administrativo.',
          'Paso 1 - Informacion Personal: completa documento, nombre, apellido, correo y telefono.',
          'Paso 2 - Informacion Laboral: ingresa la fecha de ingreso.',
          'Paso 3 - Rol Administrativo: selecciona el rol del administrativo.',
          'Paso 4 - Resumen: revisa toda la informacion y presiona Crear Administrativo.'
        ]
      },
      {
        id: 'detalle-administrativo',
        title: 'Ver Detalle del Administrativo',
        description: 'Consulta informacion completa: datos personales, laborales y rol.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de ver detalle.',
          'Se abrira la ventana con informacion completa del administrativo.'
        ]
      },
      {
        id: 'editar-administrativo',
        title: 'Editar Administrativo',
        description: 'Modifica la informacion personal y el rol de un administrativo.',
        requiredAction: 'edit',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de editar.',
          'Paso 1 - Edita la informacion personal.',
          'Paso 2 - Edita la informacion laboral o el rol asignado.',
          'Paso 3 - Revisa el resumen y presiona Guardar Cambios.'
        ]
      },
      {
        id: 'estado-administrativo',
        title: 'Cambiar Estado del Administrativo',
        description: 'Activa o desactiva la cuenta de un administrativo.',
        requiredAction: 'changeStatus',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, ubica el selector de Estado Laboral.',
          'Selecciona Activo o Inactivo.',
          'Un administrativo desactivado pierde acceso inmediato a la plataforma.'
        ]
      },
      {
        id: 'acceso-seguro',
        title: 'Acceso del Administrativo',
        description: 'Controla inicio de sesion, recuperacion de contrasena y cierre de sesion seguro.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Iniciar sesion: en el login, ingresa correo electronico y contrasena y presiona Iniciar Sesion.',
          'Recuperar contrasena: usa Olvidaste tu contrasena, ingresa tu correo y sigue el enlace enviado.',
          'Cerrar sesion: usa la opcion Cerrar Sesion en la parte inferior del menu lateral para salir de forma segura.'
        ]
      }
    ],
    cloudinaryVideoUrl: null,
    placeholderMessage: null
  },
  {
    id: 'roles',
    label: 'Roles',
    shortDescription: 'Configura perfiles de acceso y permisos por modulo.',
    description: 'Permite administrar los perfiles de acceso del sistema. Desde aqui puedes crear roles personalizados y configurar exactamente que puede hacer cada rol en cada modulo de la plataforma.',
    icon: ShieldCheck,
    routePatterns: ['/seguridad/roles'],
    parentPermissionModule: 'roles',
    requiredAccess: { module: 'roles', action: 'view' },
    sections: [
      {
        id: 'listar-roles',
        title: 'Listar Roles',
        description: 'Visualiza todos los roles registrados en el sistema, su estado y las acciones disponibles.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ingresa al modulo Seguridad -> Roles desde el menu lateral.',
          'Visualiza la tabla con todos los roles, su estado y las acciones disponibles.',
          'Recuerda que los roles Super Administrador y Administrador estan protegidos y no pueden modificarse ni eliminarse.'
        ]
      },
      {
        id: 'consultar-rol',
        title: 'Consultar Rol',
        description: 'Localiza un rol especifico por nombre.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ubica el campo de busqueda en la parte superior de la tabla.',
          'Ingresa el nombre del rol que deseas encontrar.',
          'Revisa los resultados mostrados en la tabla.'
        ]
      },
      {
        id: 'filtrar-roles',
        title: 'Filtrar Roles',
        description: 'Filtra los roles por su estado: Todos, Activos o Inactivos.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'Ubica el selector de filtro en la parte superior de la tabla.',
          'Selecciona Todos, Activos o Inactivos segun lo que necesites visualizar.',
          'La tabla se actualizara automaticamente.'
        ]
      },
      {
        id: 'registrar-rol',
        title: 'Registrar Rol',
        description: 'Crea un nuevo rol personalizado con permisos especificos por modulo.',
        requiredAction: 'create',
        cloudinaryVideoUrl: null,
        steps: [
          'Presiona el boton + Nuevo Rol en la parte superior derecha.',
          'Ingresa el nombre del nuevo rol.',
          'Configura los permisos por modulo segun las necesidades del rol.',
          'Presiona Guardar para registrar el nuevo rol.'
        ]
      },
      {
        id: 'detalle-rol',
        title: 'Ver Detalle del Rol',
        description: 'Consulta la informacion completa y los permisos de un rol.',
        requiredAction: 'view',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de ver detalle en el rol que deseas consultar.',
          'Se abrira una ventana con la informacion completa del rol y sus permisos por modulo.'
        ]
      },
      {
        id: 'editar-rol',
        title: 'Editar Rol',
        description: 'Modifica el nombre y permisos de un rol personalizado.',
        requiredAction: 'edit',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de editar.',
          'Se abrira el formulario con la informacion actual del rol.',
          'Realiza los cambios necesarios en el nombre o permisos.',
          'Presiona Guardar Cambios para confirmar la actualizacion.'
        ]
      },
      {
        id: 'estado-rol',
        title: 'Cambiar Estado del Rol',
        description: 'Activa o desactiva un rol desde la tabla principal.',
        requiredAction: 'changeStatus',
        cloudinaryVideoUrl: null,
        steps: [
          'Ubica el toggle de estado en la columna correspondiente del rol.',
          'Presiona el control para cambiar entre Activo e Inactivo.',
          'Los roles protegidos no pueden desactivarse.'
        ]
      },
      {
        id: 'eliminar-rol',
        title: 'Eliminar Rol',
        description: 'Elimina roles personalizados que ya no sean necesarios.',
        requiredAction: 'delete',
        cloudinaryVideoUrl: null,
        steps: [
          'En la tabla principal, presiona el icono de eliminar.',
          'El sistema mostrara un modal de confirmacion.',
          'Confirma la accion para eliminar el rol definitivamente.',
          'No es posible eliminar roles con usuarios asignados ni roles protegidos.'
        ]
      }
    ],
    cloudinaryVideoUrl: null,
    placeholderMessage: null
  }
];

const HELP_ROUTE_ENTRIES = HELP_MODULES.flatMap((moduleItem) =>
  (moduleItem.routePatterns || []).map((pattern) => ({
    moduleId: moduleItem.id,
    pattern
  }))
).sort((left, right) => right.pattern.length - left.pattern.length);

export const getHelpModuleById = (moduleId) =>
  HELP_MODULES.find((moduleItem) => moduleItem.id === moduleId) || null;

export const resolveHelpModuleIdFromPathname = (pathname = '') => {
  const match = HELP_ROUTE_ENTRIES.find(({ pattern }) =>
    pathname === pattern || pathname.startsWith(`${pattern}/`)
  );

  return match?.moduleId || null;
};
