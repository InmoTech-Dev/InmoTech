# Documentación de la API - Sistema Inmotech

## Descripción General

Se ha desarrollado una API RESTful profesional para el módulo de Citas del sistema inmobiliario Inmotech. La API está construida con las mejores prácticas de desarrollo, garantizando seguridad, velocidad y claridad en todos sus endpoints.

## Tecnologías Utilizadas

- **Node.js**: Runtime de JavaScript
- **Express.js**: Framework web minimalista y rápido
- **Sequelize**: ORM avanzado para SQL Server
- **SQL Server**: Sistema de gestión de base de datos
- **Joi**: Validación robusta de esquemas
- **Winston**: Sistema de logging profesional
- **Helmet**: Seguridad HTTP headers
- **CORS**: Gestión de orígenes cruzados
- **Express Rate Limit**: Protección contra abuso

## Ubicación de la API

```
proyecto/
└── api/
    ├── src/
    │   ├── config/         # Configuraciones (DB, CORS)
    │   ├── controllers/    # Controladores de rutas
    │   ├── middlewares/    # Middlewares personalizados
    │   ├── models/         # Modelos Sequelize
    │   ├── routes/         # Definición de rutas
    │   ├── services/       # Lógica de negocio
    │   ├── utils/          # Utilidades (logger)
    │   ├── validators/     # Validadores Joi
    │   ├── app.js          # Configuración Express
    │   └── server.js       # Punto de entrada
    ├── database/           # Scripts SQL
    ├── docs/               # Documentación de procesos
    ├── logs/               # Logs de aplicación
    ├── .env                # Variables de entorno
    ├── .env.example        # Ejemplo de variables
    ├── package.json        # Dependencias
    ├── README.md           # Documentación principal
    ├── ENDPOINTS.md        # Documentación de endpoints
    └── QUICKSTART.md       # Guía de inicio rápido
```

## Características Principales

### 1. Arquitectura en Capas

La API sigue una arquitectura en capas para separación de responsabilidades:

- **Rutas**: Definen endpoints y aplican middlewares
- **Controladores**: Manejan requests/responses
- **Servicios**: Contienen lógica de negocio
- **Modelos**: Definen estructura de datos
- **Middlewares**: Validan, sanitizan y protegen
- **Validadores**: Esquemas Joi para validación

### 2. Seguridad de Clase Empresarial

#### Rate Limiting
- **General**: 100 requests por 15 minutos
- **Creación de citas**: 20 requests por hora
- **Operaciones sensibles**: 30 requests por 15 minutos

#### Protecciones Implementadas
- Helmet para headers de seguridad
- CORS configurado con whitelist
- Sanitización de inputs (prevención XSS)
- Validación estricta con Joi
- SQL Injection protegido por Sequelize ORM

### 3. Validación Robusta

Todas las entradas son validadas usando Joi:

```javascript
// Ejemplo de validación
{
  "tipo_documento": "CC",           // Enum: CC, CE, NIT, Pasaporte, TI
  "numero_documento": "1234567890", // 6-20 caracteres, alfanumérico
  "primer_nombre": "Juan",          // 2-50 caracteres, solo letras
  "correo": "email@valid.com",      // Email RFC válido
  "telefono": "+57 300 123 4567"    // Formato colombiano
}
```

### 4. Sistema de Logging Profesional

Winston gestiona logs en múltiples niveles:

- `error.log`: Solo errores críticos
- `combined.log`: Todos los eventos
- `exceptions.log`: Excepciones no capturadas
- `rejections.log`: Promesas rechazadas

### 5. Manejo de Errores Centralizado

Respuestas consistentes en toda la API:

**Éxito**:
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { }
}
```

**Error**:
```json
{
  "success": false,
  "message": "Error de validación",
  "errors": [
    { "field": "correo", "message": "Email inválido" }
  ]
}
```

### 6. Optimización de Base de Datos

#### Índices Estratégicos
```sql
-- Optimización para búsquedas frecuentes
IX_Citas_Estado (id_estado_cita, fecha_cita, hora_inicio)
IX_Citas_Agente (id_agente_asignado)
IX_Citas_Fecha (fecha_cita, hora_inicio)
IX_Citas_Persona (id_persona)
IX_Personas_Documento (tipo_documento, numero_documento)
```

#### Pool de Conexiones
```javascript
pool: {
  max: 10,      // Máximo 10 conexiones
  min: 0,       // Mínimo 0
  acquire: 30000,  // Timeout 30s
  idle: 10000   // Liberar después de 10s
}
```

## Módulo de Citas - Funcionalidades

### 1. Gestión de Personas

#### Característica: Auto-registro y Autocompletado

Cuando una persona solicita una cita:
1. La API busca si existe por tipo y número de documento
2. Si existe: actualiza sus datos y retorna información completa
3. Si no existe: crea registro nuevo automáticamente

Esto permite el **autocompletado inteligente** en formularios.

**Endpoint**:
```
GET /api/v1/citas/buscar-persona?tipo_documento=CC&numero_documento=123
```

### 2. Creación de Citas

#### Flujo sin cuenta (desde página web):

```javascript
// 1. Usuario llena formulario
POST /api/v1/citas
{
  "tipo_documento": "CC",
  "numero_documento": "1234567890",
  "primer_nombre": "Juan",
  "primer_apellido": "Pérez",
  "correo": "juan@example.com",
  "telefono": "+57 300 123 4567",
  "id_inmueble": 1,
  "id_servicio": 1,        // 1: Visita a Propiedad
  "fecha_cita": "2025-10-25",
  "hora_inicio": "10:00",
  "hora_fin": "11:00",
  "observaciones": "Interesado en el inmueble"
}

// 2. API procesa:
//    - Crea/actualiza persona
//    - Valida disponibilidad de horario
//    - Crea cita con estado "Solicitada"
//    - Genera notificación para agentes

// 3. Retorna cita creada
```

### 3. Sistema de Notificaciones

#### Automáticas y en Tiempo Real

La API crea notificaciones automáticamente cuando:
- Se solicita una cita nueva → Notifica a TODOS los agentes
- Se confirma una cita → Notifica al cliente
- Se cancela una cita → Notifica al cliente
- Se reagenda una cita → Notifica al cliente
- Se completa una cita → Notifica al cliente

**Obtener notificaciones**:
```javascript
GET /api/v1/notificaciones?id_rol=2  // Rol 2 = Agente Inmobiliario
```

### 4. Confirmación por Agente

#### Flujo desde Dashboard:

```javascript
// 1. Agente obtiene notificaciones
GET /api/v1/notificaciones?id_rol=2

// 2. Agente confirma cita (se asigna automáticamente)
POST /api/v1/citas/1/confirmar
{
  "id_agente_asignado": 2
}

// 3. API procesa:
//    - Cambia estado a "Confirmada"
//    - Asigna agente a la cita
//    - Notifica al cliente
//    - Marca notificación como procesada
//    - La cita ya NO aparece para otros agentes
```

### 5. Estados de Citas

La API gestiona 6 estados diferentes:

| ID | Estado | Descripción | Puede cambiar a |
|----|--------|-------------|-----------------|
| 1 | Solicitada | Recién creada, pendiente confirmación | Confirmada, Cancelada |
| 2 | Confirmada | Aceptada por agente | Programada, Reagendada, Cancelada |
| 3 | Programada | Lista para realizarse | Completada, Reagendada, Cancelada |
| 4 | Reagendada | Cambió fecha/hora | Confirmada, Completada, Cancelada |
| 5 | Completada | Finalizada exitosamente | *(estado final)* |
| 6 | Cancelada | Cancelada por cliente/agente | *(estado final)* |

### 6. Operaciones Disponibles

#### Confirmar Cita
```
POST /api/v1/citas/:id/confirmar
```

#### Cancelar Cita
```
POST /api/v1/citas/:id/cancelar
{ "motivo_cancelacion": "Razón de cancelación" }
```

#### Reagendar Cita
```
POST /api/v1/citas/:id/reagendar
{
  "fecha_cita": "2025-10-26",
  "hora_inicio": "14:00",
  "hora_fin": "15:00"
}
```

#### Completar Cita
```
POST /api/v1/citas/:id/completar
```

#### Actualizar Cita
```
PATCH /api/v1/citas/:id
{ "observaciones": "Nueva observación" }
```

#### Eliminar Cita
```
DELETE /api/v1/citas/:id
```

### 7. Filtros Avanzados

Obtener citas con filtros:

```javascript
// Por estado
GET /api/v1/citas?estado=1

// Por fecha
GET /api/v1/citas?fecha=2025-10-25

// Por agente
GET /api/v1/citas?agente=2

// Combinados
GET /api/v1/citas?estado=1&fecha=2025-10-25
```

## Servicios Disponibles

La API soporta 4 tipos de servicios:

| ID | Nombre | Duración | Descripción |
|----|--------|----------|-------------|
| 1 | Visita a Propiedad | 45 min | Visita presencial al inmueble |
| 2 | Avalúos | 60 min | Tasación y avalúo profesional |
| 3 | Gestión de Alquileres | 30 min | Asesoría sobre alquileres |
| 4 | Asesoría Legal | 45 min | Consulta legal inmobiliaria |

## Inicio Rápido

### 1. Instalar Dependencias
```bash
cd api
npm install
```

### 2. Configurar Base de Datos
1. Ejecutar script: `api/database/Bd relacional Inmotech copy copy.txt`
2. Editar `.env` con credenciales

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Verificar
```bash
curl http://localhost:5000/api/v1/health
```

## Integración con Frontend

### Ejemplo React

```javascript
const API_URL = 'http://localhost:5000/api/v1';

// Crear cita
const crearCita = async (datos) => {
  const response = await fetch(`${API_URL}/citas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return await response.json();
};

// Buscar persona
const buscarPersona = async (tipo, numero) => {
  const response = await fetch(
    `${API_URL}/citas/buscar-persona?tipo_documento=${tipo}&numero_documento=${numero}`
  );
  return await response.json();
};

// Obtener notificaciones
const getNotificaciones = async (idRol) => {
  const response = await fetch(`${API_URL}/notificaciones?id_rol=${idRol}`);
  return await response.json();
};
```

## Documentación Completa

Para información detallada, consulta:

- **`api/README.md`**: Documentación principal de la API
- **`api/ENDPOINTS.md`**: Especificación completa de todos los endpoints
- **`api/QUICKSTART.md`**: Guía de inicio rápido

## Rendimiento

### Optimizaciones Implementadas

1. **Compresión gzip**: Respuestas comprimidas automáticamente
2. **Pool de conexiones**: Reutilización de conexiones DB
3. **Índices estratégicos**: Queries optimizadas
4. **Caching de modelos**: Sequelize optimizado
5. **Lazy loading**: Relaciones cargadas bajo demanda

### Métricas Esperadas

- **Tiempo de respuesta promedio**: < 100ms
- **Queries a DB**: < 50ms
- **Throughput**: > 1000 req/s
- **Memory footprint**: ~50MB

## Seguridad Implementada

✅ Rate limiting multinivel
✅ Validación estricta de inputs
✅ Sanitización contra XSS
✅ SQL Injection protegido
✅ CORS configurado
✅ Helmet security headers
✅ Logging de auditoría
✅ Manejo de errores seguro
✅ Transacciones ACID
✅ Índices únicos en datos críticos

## Soporte y Mantenimiento

Para reportar problemas o solicitar nuevas funcionalidades, contacta al equipo de desarrollo de Inmotech.

---

**API desarrollada con estándares profesionales de la industria** 🚀

Desarrollado por: Equipo Inmotech
Fecha: Octubre 2025
Versión: 1.0.0
