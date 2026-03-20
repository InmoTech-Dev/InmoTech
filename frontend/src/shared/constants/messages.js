// Centralized user-facing messages for CRUD actions.
// Update values here to change toast/alert texts app-wide.
const MESSAGES = {
  sale: {
    create: {
      success: "Venta registrada correctamente.",
      partialBuyer: "Venta registrada, pero no se pudo actualizar la ficha del comprador. Revisa el módulo de compradores.",
      error: "No se pudo registrar la venta en la API. Revisa los datos e intenta nuevamente.",
    },
    tracking: {
      success: "Estados guardados correctamente.",
      error: "No se pudo actualizar el estado. Intenta nuevamente.",
      missing: "No se pudo registrar seguimiento: falta id_comprador o estado.",
    },
    validation: {
      buyerRequired: "Debes ingresar un comprador registrado (tipo y número de documento) para continuar.",
      propertiesLoading: "Esperamos a que cargue el catálogo de inmuebles. Intenta registrar la venta en unos segundos.",
      propertiesEmpty: "No hay inmuebles disponibles en el catálogo. Registra o activa uno antes de crear la venta.",
      propertyNotFound: "No encontramos un inmueble que coincida con el registro ingresado. Verifica el número de matrícula.",
      propertyIdInvalid: "El inmueble seleccionado no tiene un identificador válido.",
      leaseActive: "El inmueble seleccionado tiene un arriendo activo. Finaliza o marca el contrato como inactivo antes de registrarlo como venta.",
      sold: "El inmueble ya aparece como vendido en el sistema. No se puede registrar otra venta para este registro.",
    },
  },
  buyer: {
    create: "Comprador registrado correctamente en la plataforma",
    update: "Comprador actualizado correctamente en la plataforma",
    delete: "Comprador eliminado correctamente de la plataforma",
    loadError: "No fue posible cargar los compradores",
    createError: "No fue posible crear el comprador",
    updateError: "No fue posible actualizar el comprador",
    deleteError: "No fue posible eliminar el comprador",
  },
  leaseTenant: {
    create: "Arrendatario creado correctamente",
    update: "Arrendatario actualizado correctamente",
    delete: "Arrendatario eliminado correctamente",
    createError: "No fue posible crear el arrendatario",
    updateError: "No fue posible actualizar el arrendatario",
    deleteError: "No fue posible eliminar el arrendatario",
  },
  leaseContract: {
    sync: "Arriendo sincronizado con la API",
    stateUpdate: "Estado del arriendo actualizado",
    delete: "Arriendo eliminado correctamente",
    loadError: "No fue posible cargar los arrendatarios",
    stateError: "No se pudo actualizar el estado",
    deleteError: "No se pudo eliminar el arriendo",
  },
};

export default MESSAGES;
