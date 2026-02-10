# Documentación Completa de Endpoints - API Inmotech Citas

## Índice
- [Información General](#información-general)
- [Endpoints de Citas](#endpoints-de-citas)
- [Endpoints de Notificaciones](#endpoints-de-notificaciones)
- [Códigos de Respuesta](#códigos-de-respuesta)

---

## Información General

**Base URL**: `http://localhost:5000/api/v1`

**Formato de Respuesta**: JSON

**Headers Requeridos**:
```
Content-Type: application/json
Accept: application/json
```

---

## Endpoints de Citas

### 1. Crear Nueva Cita

**Endpoint**: `POST /api/v1/citas`

**Descripción**: Crea una nueva cita. Si la persona no existe en el sistema, la crea automáticamente. Si existe, actualiza sus datos.

**Caso de Uso**:
- Usuario sin cuenta solicita cita desde el modal de detalles del inmueble
- Agente crea cita manualmente desde el dashboard

**Rate Limit**: 20 solicitudes por hora

**Request Body**:
```json
{
  "tipo_documento": "CC",
  "numero_documento": "1234567890",
  "primer_nombre": "Juan",
  "segundo_nombre": "Carlos",
  "primer_apellido": "Pérez",
  "segundo_apellido": "García",
  "correo": "juan.perez@example.com",
  "telefono": "+57 300 123 4567",
  "id_inmueble": 1,
  "id_servicio": 1,
  "fecha_cita": "2025-10-25",
  "hora_inicio": "10:00",
  "hora_fin": "11:00",
  "observaciones": "Interesado en conocer el inmueble",
  "id_estado_cita": 1
}
```

**Campos Obligatorios**:
- `tipo_documento`: CC, CE, NIT, Pasaporte, TI
- `numero_documento`: 6-20 caracteres
- `primer_nombre`: 2-50 caracteres, solo letras
- `primer_apellido`: 2-50 caracteres, solo letras
- `correo`: Email válido
- `telefono`: Formato colombiano (+57 XXX XXX XXXX)
- `id_inmueble`: ID del inmueble
- `id_servicio`: ID del servicio (1: Visita a Propiedad, 2: Avalúos, 3: Gestión de Alquileres, 4: Asesoría Legal)
- `fecha_cita`: Fecha futura en formato YYYY-MM-DD
- `hora_inicio`: Formato HH:MM
- `hora_fin`: Formato HH:MM (debe ser mayor que hora_inicio)

**Campos Opcionales**:
- `segundo_nombre`
- `segundo_apellido`
- `observaciones`
- `id_estado_cita` (Por defecto: 1 - Solicitada)

**Response Success (201)**:
```json
{
  "success": true,
  "message": "Cita creada exitosamente",
  "data": {
    "id_cita": 1,
    "fecha_cita": "2025-10-25",
    "hora_inicio": "10:00:00",
    "hora_fin": "11:00:00",
    "observaciones": "Interesado en conocer el inmueble",
    "fecha_creacion": "2025-10-21T10:30:00.000Z",
    "cliente": {
      "id_persona": 1,
      "tipo_documento": "CC",
      "numero_documento": "1234567890",
      "primer_nombre": "Juan",
      "segundo_nombre": "Carlos",
      "primer_apellido": "Pérez",
      "segundo_apellido": "García",
      "correo": "juan.perez@example.com",
      "telefono": "+57 300 123 4567"
    },
    "inmueble": {
      "id_inmueble": 1,
      "registro_inmobiliario": "REG-001",
      "direccion": "Calle 123 # 45-67",
      "ciudad": "Bogotá",
      "categoria": "Apartamento"
    },
    "servicio": {
      "id_servicio": 1,
      "nombre_servicio": "Visita a Propiedad",
      "duracion_estimada": 45
    },
    "estado": {
      "id_estado_cita": 1,
      "nombre_estado": "Solicitada"
    }
  }
}
```

**Response Error (400)**:
```json
{
  "success": false,
  "message": "Error de validación",
  "errors": [
    {
      "field": "correo",
      "message": "El correo electrónico no es válido"
    },
    {
      "field": "telefono",
      "message": "El teléfono debe tener formato colombiano (+57 XXX XXX XXXX o 3XX XXX XXXX)"
    }
  ]
}
```

---

### 2. Buscar Persona por Documento

**Endpoint**: `GET /api/v1/citas/buscar-persona`

**Descripción**: Busca una persona registrada por su tipo y número de documento. Útil para autocompletar formularios.

**Caso de Uso**:
- Autocompletado cuando el usuario ingresa tipo y número de documento
- Verificar si una persona ya existe en el sistema

**Query Parameters**:
- `tipo_documento`: CC, CE, NIT, Pasaporte, TI (requerido)
- `numero_documento`: Número del documento (requerido)

**Request Example**:
```
GET /api/v1/citas/buscar-persona?tipo_documento=CC&numero_documento=1234567890
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Persona encontrada",
  "data": {
    "id_persona": 1,
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "primer_nombre": "Juan",
    "segundo_nombre": "Carlos",
    "primer_apellido": "Pérez",
    "segundo_apellido": "García",
    "correo": "juan.perez@example.com",
    "telefono": "+57 300 123 4567",
    "tiene_cuenta": false
  }
}
```

**Response Not Found (404)**:
```json
{
  "success": false,
  "message": "Persona no encontrada"
}
```

---

### 3. Obtener Todas las Citas

**Endpoint**: `GET /api/v1/citas`

**Descripción**: Obtiene todas las citas con filtros opcionales.

**Caso de Uso**:
- Listar citas en el dashboard del agente
- Filtrar citas por estado, fecha o agente

**Query Parameters (Opcionales)**:
- `estado`: ID del estado de cita
- `fecha`: Fecha en formato YYYY-MM-DD
- `agente`: ID del agente asignado

**Request Examples**:
```
GET /api/v1/citas
GET /api/v1/citas?estado=1
GET /api/v1/citas?fecha=2025-10-25
GET /api/v1/citas?agente=2
GET /api/v1/citas?estado=1&fecha=2025-10-25
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Citas obtenidas exitosamente",
  "data": [
    {
      "id_cita": 1,
      "fecha_cita": "2025-10-25",
      "hora_inicio": "10:00:00",
      "hora_fin": "11:00:00",
      "observaciones": "Interesado en conocer el inmueble",
      "cliente": {
        "id_persona": 1,
        "primer_nombre": "Juan",
        "primer_apellido": "Pérez",
        "telefono": "+57 300 123 4567",
        "correo": "juan.perez@example.com"
      },
      "inmueble": {
        "id_inmueble": 1,
        "direccion": "Calle 123 # 45-67",
        "ciudad": "Bogotá"
      },
      "servicio": {
        "nombre_servicio": "Visita a Propiedad"
      },
      "estado": {
        "nombre_estado": "Solicitada"
      },
      "agente": null
    }
  ],
  "total": 1
}
```

---

### 4. Obtener Cita por ID

**Endpoint**: `GET /api/v1/citas/:id`

**Descripción**: Obtiene los detalles completos de una cita específica.

**Caso de Uso**:
- Ver detalles completos de una cita
- Modal de visualización en el dashboard

**Path Parameters**:
- `id`: ID de la cita

**Request Example**:
```
GET /api/v1/citas/1
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Cita obtenida exitosamente",
  "data": {
    "id_cita": 1,
    "fecha_cita": "2025-10-25",
    "hora_inicio": "10:00:00",
    "hora_fin": "11:00:00",
    "observaciones": "Interesado en conocer el inmueble",
    "es_reagendada": false,
    "fecha_creacion": "2025-10-21T10:30:00.000Z",
    "fecha_confirmacion": null,
    "cliente": {
      "id_persona": 1,
      "tipo_documento": "CC",
      "numero_documento": "1234567890",
      "primer_nombre": "Juan",
      "segundo_nombre": "Carlos",
      "primer_apellido": "Pérez",
      "segundo_apellido": "García",
      "correo": "juan.perez@example.com",
      "telefono": "+57 300 123 4567"
    },
    "inmueble": {
      "id_inmueble": 1,
      "registro_inmobiliario": "REG-001",
      "direccion": "Calle 123 # 45-67",
      "ciudad": "Bogotá",
      "categoria": "Apartamento"
    },
    "servicio": {
      "id_servicio": 1,
      "nombre_servicio": "Visita a Propiedad",
      "duracion_estimada": 45
    },
    "estado": {
      "id_estado_cita": 1,
      "nombre_estado": "Solicitada"
    },
    "agente": null
  }
}
```

**Response Not Found (404)**:
```json
{
  "success": false,
  "message": "Cita no encontrada"
}
```

---

### 5. Confirmar Cita

**Endpoint**: `POST /api/v1/citas/:id/confirmar`

**Descripción**: Confirma una cita y asigna un agente. Cambia el estado a "Confirmada".

**Caso de Uso**:
- Agente acepta una cita solicitada desde la campana de notificaciones
- Agente confirma una cita desde la tabla de citas

**Path Parameters**:
- `id`: ID de la cita

**Request Body**:
```json
{
  "id_agente_asignado": 2
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Cita confirmada exitosamente",
  "data": {
    "id_cita": 1,
    "fecha_cita": "2025-10-25",
    "hora_inicio": "10:00:00",
    "hora_fin": "11:00:00",
    "fecha_confirmacion": "2025-10-21T11:00:00.000Z",
    "estado": {
      "id_estado_cita": 2,
      "nombre_estado": "Confirmada"
    },
    "agente": {
      "id_persona": 2,
      "primer_nombre": "María",
      "primer_apellido": "González",
      "correo": "maria.gonzalez@inmotech.com",
      "telefono": "+57 300 987 6543"
    }
  }
}
```

---

### 6. Cancelar Cita

**Endpoint**: `POST /api/v1/citas/:id/cancelar`

**Descripción**: Cancela una cita y registra el motivo. Cambia el estado a "Cancelada".

**Caso de Uso**:
- Agente cancela cita desde notificaciones
- Usuario solicita cancelación

**Path Parameters**:
- `id`: ID de la cita

**Request Body**:
```json
{
  "motivo_cancelacion": "El cliente solicitó cancelar debido a conflictos de horario"
}
```

**Campos Obligatorios**:
- `motivo_cancelacion`: 10-500 caracteres

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Cita cancelada exitosamente",
  "data": {
    "id_cita": 1,
    "motivo_cancelacion": "El cliente solicitó cancelar debido a conflictos de horario",
    "fecha_cancelacion": "2025-10-21T11:15:00.000Z",
    "estado": {
      "id_estado_cita": 6,
      "nombre_estado": "Cancelada"
    }
  }
}
```

---

### 7. Reagendar Cita

**Endpoint**: `POST /api/v1/citas/:id/reagendar`

**Descripción**: Reagenda una cita a nueva fecha y hora. Cambia el estado a "Reagendada".

**Caso de Uso**:
- Cliente solicita cambio de fecha
- Agente reagenda por disponibilidad

**Path Parameters**:
- `id`: ID de la cita

**Request Body**:
```json
{
  "fecha_cita": "2025-10-26",
  "hora_inicio": "14:00",
  "hora_fin": "15:00"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Cita reagendada exitosamente",
  "data": {
    "id_cita": 1,
    "fecha_cita": "2025-10-26",
    "hora_inicio": "14:00:00",
    "hora_fin": "15:00:00",
    "es_reagendada": true,
    "estado": {
      "id_estado_cita": 4,
      "nombre_estado": "Reagendada"
    }
  }
}
```

---

### 8. Completar Cita

**Endpoint**: `POST /api/v1/citas/:id/completar`

**Descripción**: Marca una cita como completada. Cambia el estado a "Completada".

**Caso de Uso**:
- Agente marca cita realizada
- Sistema automático al finalizar hora de cita

**Path Parameters**:
- `id`: ID de la cita

**Request Body**: No requiere

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Cita completada exitosamente",
  "data": {
    "id_cita": 1,
    "fecha_completada": "2025-10-25T11:00:00.000Z",
    "estado": {
      "id_estado_cita": 5,
      "nombre_estado": "Completada"
    }
  }
}
```

---

### 9. Actualizar Cita

**Endpoint**: `PATCH /api/v1/citas/:id`

**Descripción**: Actualiza campos específicos de una cita.

**Caso de Uso**:
- Modificar observaciones
- Cambiar estado manualmente
- Actualizar datos de la cita

**Path Parameters**:
- `id`: ID de la cita

**Request Body** (Todos los campos son opcionales):
```json
{
  "observaciones": "Cliente muy interesado, preguntar por financiación",
  "id_estado_cita": 3
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Cita actualizada exitosamente",
  "data": {
    "id_cita": 1,
    "observaciones": "Cliente muy interesado, preguntar por financiación",
    "estado": {
      "id_estado_cita": 3,
      "nombre_estado": "Programada"
    }
  }
}
```

---

### 10. Eliminar Cita

**Endpoint**: `DELETE /api/v1/citas/:id`

**Descripción**: Elimina permanentemente una cita del sistema.

**Caso de Uso**:
- Eliminar citas de prueba
- Limpieza de datos erróneos

**Path Parameters**:
- `id`: ID de la cita

**Request Body**: No requiere

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Cita eliminada exitosamente"
}
```

---

## Endpoints de Notificaciones

### 1. Obtener Notificaciones No Leídas

**Endpoint**: `GET /api/v1/notificaciones`

**Descripción**: Obtiene todas las notificaciones no leídas, filtradas por rol o persona.

**Caso de Uso**:
- Campana de notificaciones en el dashboard
- Listado de citas solicitadas para agentes

**Query Parameters (Opcionales)**:
- `id_rol`: ID del rol (2 para Agente Inmobiliario)
- `id_persona`: ID de la persona específica

**Request Examples**:
```
GET /api/v1/notificaciones
GET /api/v1/notificaciones?id_rol=2
GET /api/v1/notificaciones?id_persona=5
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Notificaciones obtenidas exitosamente",
  "data": [
    {
      "id_notificacion": 1,
      "tipo_notificacion": "CITA_SOLICITADA",
      "titulo": "Nueva Cita Solicitada",
      "mensaje": "Juan Pérez ha solicitado una cita para el 2025-10-25",
      "leida": false,
      "fecha_creacion": "2025-10-21T10:30:00.000Z",
      "cita": {
        "id_cita": 1,
        "fecha_cita": "2025-10-25",
        "hora_inicio": "10:00:00",
        "cliente": {
          "primer_nombre": "Juan",
          "primer_apellido": "Pérez"
        },
        "inmueble": {
          "direccion": "Calle 123 # 45-67"
        }
      }
    }
  ],
  "total": 1
}
```

---

### 2. Marcar Notificación como Leída

**Endpoint**: `PATCH /api/v1/notificaciones/:id/leer`

**Descripción**: Marca una notificación específica como leída.

**Path Parameters**:
- `id`: ID de la notificación

**Request Body**: No requiere

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Notificación marcada como leída",
  "data": {
    "id_notificacion": 1,
    "leida": true,
    "fecha_leida": "2025-10-21T11:00:00.000Z"
  }
}
```

---

### 3. Marcar Múltiples Notificaciones como Leídas

**Endpoint**: `POST /api/v1/notificaciones/leer-multiples`

**Descripción**: Marca varias notificaciones como leídas en una sola operación.

**Request Body**:
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "5 notificaciones marcadas como leídas"
}
```

---

## Códigos de Respuesta

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Operación exitosa |
| 201 | Created | Recurso creado exitosamente |
| 400 | Bad Request | Error de validación en los datos enviados |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto (ejemplo: horario ocupado) |
| 429 | Too Many Requests | Límite de peticiones excedido |
| 500 | Internal Server Error | Error interno del servidor |

---

## Estados de Citas

| ID | Nombre | Descripción |
|----|--------|-------------|
| 1 | Solicitada | Cita solicitada, pendiente de confirmación |
| 2 | Confirmada | Cita confirmada por un agente |
| 3 | Programada | Cita programada y lista para realizarse |
| 4 | Reagendada | Cita reagendada a nueva fecha/hora |
| 5 | Completada | Cita completada exitosamente |
| 6 | Cancelada | Cita cancelada |

---

## Servicios Disponibles

| ID | Nombre | Duración |
|----|--------|----------|
| 1 | Visita a Propiedad | 45 min |
| 2 | Avalúos | 60 min |
| 3 | Gestión de Alquileres | 30 min |
| 4 | Asesoría Legal | 45 min |

---

## Rate Limits

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| General | 100 requests | 15 minutos |
| POST /citas | 20 requests | 1 hora |
| POST /citas/:id/* | 30 requests | 15 minutos |
| PATCH /citas/:id | 30 requests | 15 minutos |
| DELETE /citas/:id | 30 requests | 15 minutos |

---

## Notas Importantes

1. **Autocompletado**: Siempre llamar a `/buscar-persona` antes de crear una cita para verificar si la persona existe
2. **Validación de Horarios**: La API verifica automáticamente conflictos de horarios
3. **Notificaciones Automáticas**: Se crean automáticamente al cambiar estados de citas
4. **Transacciones**: Todas las operaciones críticas usan transacciones de base de datos
5. **Zona Horaria**: Todos los timestamps están en UTC
