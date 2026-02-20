# API Inmotech - Módulo de Citas

API RESTful robusta y escalable para la gestión del módulo de citas del sistema inmobiliario Inmotech, construida con Node.js, Express y Sequelize con SQL Server.

## Características Principales

- **Arquitectura en capas**: Separación clara entre controladores, servicios, modelos y rutas
- **Seguridad avanzada**: Rate limiting, sanitización de inputs, Helmet, CORS configurado
- **Validación robusta**: Validación de datos con Joi en todas las entradas
- **ORM optimizado**: Sequelize con soporte completo para SQL Server
- **Logging profesional**: Winston para logs estructurados y trazabilidad
- **Manejo de errores**: Gestión centralizada de errores con respuestas consistentes
- **Alto rendimiento**: Compresión, pooling de conexiones, índices optimizados

## Requisitos Previos

- Node.js >= 16.0.0
- SQL Server (2016 o superior)
- npm >= 8.0.0

## Instalación

1. Navegar al directorio de la API:
```bash
cd api
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

4. Editar el archivo `.env` con tus credenciales de SQL Server

5. Ejecutar el script de base de datos ubicado en `database/Bd relacional Inmotech copy copy.txt`

## Ejecución

### Modo Desarrollo
```bash
npm run dev
```

### Modo Producción
```bash
npm start
```

## Estructura del Proyecto

```
api/
├── src/
│   ├── config/           # Configuraciones (DB, CORS)
│   ├── controllers/      # Controladores de rutas
│   ├── middlewares/      # Middlewares personalizados
│   ├── models/           # Modelos de Sequelize
│   ├── routes/           # Definición de rutas
│   ├── services/         # Lógica de negocio
│   ├── utils/            # Utilidades (logger, helpers)
│   ├── validators/       # Esquemas de validación Joi
│   ├── app.js            # Configuración de Express
│   └── server.js         # Punto de entrada
├── logs/                 # Logs de la aplicación
├── .env                  # Variables de entorno
├── .env.example          # Ejemplo de variables
├── package.json          # Dependencias
└── README.md             # Este archivo
```

## Endpoints de la API

### Base URL
```
http://localhost:5000/api/v1
```

### Health Check
```http
GET /api/v1/health
```

### Citas

#### Crear Cita
```http
POST /api/v1/citas
Content-Type: application/json

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
  "observaciones": "Interesado en conocer el inmueble"
}
```

#### Obtener Todas las Citas
```http
GET /api/v1/citas
GET /api/v1/citas?estado=1&fecha=2025-10-25&agente=2
```

#### Obtener Cita por ID
```http
GET /api/v1/citas/:id
```

#### Buscar Persona por Documento
```http
GET /api/v1/citas/buscar-persona?tipo_documento=CC&numero_documento=1234567890
```

#### Confirmar Cita
```http
POST /api/v1/citas/:id/confirmar
Content-Type: application/json

{
  "id_agente_asignado": 2
}
```

#### Cancelar Cita
```http
POST /api/v1/citas/:id/cancelar
Content-Type: application/json

{
  "motivo_cancelacion": "El cliente solicitó cancelar la cita"
}
```

#### Reagendar Cita
```http
POST /api/v1/citas/:id/reagendar
Content-Type: application/json

{
  "fecha_cita": "2025-10-26",
  "hora_inicio": "14:00",
  "hora_fin": "15:00"
}
```

#### Completar Cita
```http
POST /api/v1/citas/:id/completar
```

#### Actualizar Cita
```http
PATCH /api/v1/citas/:id
Content-Type: application/json

{
  "observaciones": "Cliente muy interesado"
}
```

#### Eliminar Cita
```http
DELETE /api/v1/citas/:id
```

### Notificaciones

#### Obtener Notificaciones No Leídas
```http
GET /api/v1/notificaciones
GET /api/v1/notificaciones?id_rol=2
GET /api/v1/notificaciones?id_persona=5
```

#### Marcar Notificación como Leída
```http
PATCH /api/v1/notificaciones/:id/leer
```

#### Marcar Múltiples Notificaciones como Leídas
```http
POST /api/v1/notificaciones/leer-multiples
Content-Type: application/json

{
  "ids": [1, 2, 3, 4, 5]
}
```

## Respuestas de la API

### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Operación realizada exitosamente",
  "data": { }
}
```

### Respuesta de Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": [
    {
      "field": "campo",
      "message": "Mensaje de error"
    }
  ]
}
```

## Códigos de Estado HTTP

- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Error de validación
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto (ej: registro duplicado)
- `429 Too Many Requests` - Límite de peticiones excedido
- `500 Internal Server Error` - Error interno del servidor

## Flujo de Negocio

### Creación de Cita por Usuario sin Cuenta

1. Usuario llena formulario en el frontend
2. API verifica si la persona existe por documento
3. Si existe, actualiza datos; si no, crea nueva persona
4. Crea la cita con estado "Solicitada"
5. Genera notificación para agentes inmobiliarios
6. Retorna confirmación al usuario

### Confirmación de Cita por Agente

1. Agente recibe notificación
2. Revisa detalles de la cita
3. Confirma la cita asignándose como agente
4. Estado cambia a "Confirmada"
5. Se notifica al cliente
6. Notificación desaparece de otros agentes

### Autocompletado de Datos

La API implementa un sistema inteligente:
- Al ingresar tipo y número de documento, busca si la persona existe
- Si existe, retorna todos sus datos para autocompletar
- Funciona tanto para usuarios sin cuenta como para agentes

## Seguridad

- **Rate Limiting**: 100 requests por 15 minutos (general)
- **Rate Limiting Estricto**: 30 requests por 15 minutos (operaciones sensibles)
- **Rate Limiting Creación**: 20 citas por hora
- **Helmet**: Headers de seguridad
- **CORS**: Orígenes permitidos configurables
- **Sanitización**: Prevención de XSS
- **Validación**: Joi en todas las entradas

## Logs

Los logs se guardan en la carpeta `logs/`:
- `error.log` - Solo errores
- `combined.log` - Todos los logs
- `exceptions.log` - Excepciones no capturadas
- `rejections.log` - Promesas rechazadas

## Variables de Entorno

Consulta `.env.example` para ver todas las variables disponibles.

### Invitaciones administrativas y recuperacion operativa

- Si el correo de invitacion falla, la creacion del administrativo no se revierte.
- La respuesta de `POST /api/v1/administrativos` incluye `data.invitacion.estado`:
  - `enviada`: correo enviado correctamente.
  - `pendiente_reenvio`: fallo de envio tras reintentos automaticos.
- Para casos `pendiente_reenvio`, reenviar manualmente con:
  - `POST /api/v1/invitaciones` (admin autenticado)
  - Body: `{ "id_persona": <id_persona_del_administrativo> }`

## Mejores Prácticas Implementadas

1. **Arquitectura en capas**: Separación de responsabilidades
2. **Principio DRY**: Sin código duplicado
3. **Manejo de errores**: Try-catch con middleware centralizado
4. **Transacciones**: Operaciones atómicas en base de datos
5. **Logging estructurado**: Trazabilidad completa
6. **Validación de entrada**: Joi schemas robustos
7. **Índices optimizados**: Consultas rápidas
8. **Pool de conexiones**: Máximo rendimiento
9. **Graceful shutdown**: Cierre limpio del servidor

## Soporte

Para reportar problemas o solicitar funcionalidades, contacta al equipo de desarrollo de Inmotech.

## Licencia

MIT License - Inmotech © 2025
