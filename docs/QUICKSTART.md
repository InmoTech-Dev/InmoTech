# Guía de Inicio Rápido - API Inmotech

## 1. Instalación (5 minutos)

### Paso 1: Instalar Dependencias
```bash
cd api
npm install
```

### Paso 2: Configurar Base de Datos SQL Server

Asegúrate de tener SQL Server instalado y ejecutándose.

#### Opción A: SQL Server Local
```bash
# Windows: SQL Server ya debe estar instalado
# Linux/Mac: Usar Docker
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
  -p 1433:1433 --name sqlserver \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

### Paso 3: Crear Base de Datos

1. Abre SQL Server Management Studio (SSMS) o Azure Data Studio
2. Conecta a tu instancia de SQL Server
3. Ejecuta el script ubicado en: `api/database/Bd relacional Inmotech copy copy.txt`

### Paso 4: Configurar Variables de Entorno

Edita el archivo `api/.env` con tus credenciales:

```env
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=InmobiliariaDB
DB_USER=sa
DB_PASSWORD=TuPasswordSeguro
```

### Paso 5: Iniciar Servidor

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

Deberías ver:
```
=================================================
🚀 Servidor corriendo en puerto 5000
📊 Entorno: development
🔗 URL: http://localhost:5000
📚 API: http://localhost:5000/api/v1
💚 Health: http://localhost:5000/api/v1/health
=================================================
```

## 2. Prueba Rápida (2 minutos)

### Health Check
```bash
curl http://localhost:5000/api/v1/health
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "API funcionando correctamente",
  "timestamp": "2025-10-21T...",
  "version": "v1"
}
```

### Crear Primera Cita
```bash
curl -X POST http://localhost:5000/api/v1/citas \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_documento": "CC",
    "numero_documento": "1234567890",
    "primer_nombre": "Juan",
    "primer_apellido": "Pérez",
    "correo": "juan@example.com",
    "telefono": "+57 300 123 4567",
    "id_inmueble": 1,
    "id_servicio": 1,
    "fecha_cita": "2025-10-25",
    "hora_inicio": "10:00",
    "hora_fin": "11:00"
  }'
```

### Obtener Todas las Citas
```bash
curl http://localhost:5000/api/v1/citas
```

## 3. Integración con Frontend (5 minutos)

### Configurar CORS

En `api/.env`, asegúrate de incluir la URL de tu frontend:

```env
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

En producción usa el dominio público del frontend y, si necesitas previews por rama de Vercel, puedes agregar patrones con wildcard:

```env
PUBLIC_API_URL=https://inmotech-api.duckdns.org
FRONTEND_URL=https://inmotech-red.vercel.app
ALLOWED_ORIGINS=https://inmotech-red.vercel.app,https://inmotech-dev.vercel.app,https://*.pabloisaacruizdelgado1-gmailcoms-projects.vercel.app
COOKIE_SAMESITE=none
COOKIE_SECURE=true
AUTH_VALIDATE_ORIGIN=true
```

### Ejemplo de Uso desde React

```javascript
// Configuración base
const API_URL = 'http://localhost:5000/api/v1';

// Crear cita
const crearCita = async (datosFormulario) => {
  try {
    const response = await fetch(`${API_URL}/citas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosFormulario)
    });

    const data = await response.json();

    if (data.success) {
      console.log('Cita creada:', data.data);
      return data.data;
    } else {
      console.error('Error:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error al crear cita:', error);
    throw error;
  }
};

// Buscar persona para autocompletar
const buscarPersona = async (tipoDocumento, numeroDocumento) => {
  try {
    const response = await fetch(
      `${API_URL}/citas/buscar-persona?tipo_documento=${tipoDocumento}&numero_documento=${numeroDocumento}`
    );

    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al buscar persona:', error);
    return null;
  }
};

// Obtener notificaciones
const obtenerNotificaciones = async (idRol) => {
  try {
    const response = await fetch(`${API_URL}/notificaciones?id_rol=${idRol}`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return [];
  }
};
```

## 4. Flujo Completo de Cita

### Usuario sin cuenta solicita cita:

```javascript
// 1. Usuario llena formulario
const formulario = {
  tipo_documento: 'CC',
  numero_documento: '1234567890',
  primer_nombre: 'Juan',
  primer_apellido: 'Pérez',
  correo: 'juan@example.com',
  telefono: '+57 300 123 4567',
  id_inmueble: 1,
  id_servicio: 1,
  fecha_cita: '2025-10-25',
  hora_inicio: '10:00',
  hora_fin: '11:00'
};

// 2. Enviar a API
const cita = await crearCita(formulario);
// Estado de la cita: "Solicitada"

console.log('Cita creada con ID:', cita.id_cita);
```

### Agente confirma cita:

```javascript
// 1. Obtener notificaciones no leídas
const notificaciones = await obtenerNotificaciones(2); // 2 = Rol Agente

// 2. Confirmar cita
const confirmarCita = async (idCita, idAgente) => {
  const response = await fetch(`${API_URL}/citas/${idCita}/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_agente_asignado: idAgente })
  });
  return await response.json();
};

const citaConfirmada = await confirmarCita(cita.id_cita, 2);
// Estado de la cita: "Confirmada"
```

### Autocompletado de datos:

```javascript
// En el formulario, al ingresar documento:
const handleDocumentoChange = async (tipo, numero) => {
  if (numero.length >= 6) {
    const persona = await buscarPersona(tipo, numero);

    if (persona) {
      // Autocompletar campos
      setFormulario({
        ...formulario,
        primer_nombre: persona.primer_nombre,
        segundo_nombre: persona.segundo_nombre || '',
        primer_apellido: persona.primer_apellido,
        segundo_apellido: persona.segundo_apellido || '',
        correo: persona.correo,
        telefono: persona.telefono
      });
    }
  }
};
```

## 5. Solución de Problemas Comunes

### Error: "Cannot connect to SQL Server"

**Solución**:
1. Verifica que SQL Server esté ejecutándose
2. Confirma las credenciales en `.env`
3. Verifica que el puerto 1433 esté abierto
4. Intenta con `DB_TRUST_SERVER_CERTIFICATE=true`

### Error: "Database does not exist"

**Solución**:
1. Ejecuta el script de base de datos
2. Verifica el nombre de la base de datos en `.env`

### Error: "Rate limit exceeded"

**Solución**:
1. Espera el tiempo indicado
2. Ajusta los límites en `.env`:
   ```env
   RATE_LIMIT_MAX_REQUESTS=200
   ```

### Error: "CORS policy"

**Solución**:
1. Agrega tu dominio a `ALLOWED_ORIGINS` en `.env`
2. Reinicia el servidor

## 6. Endpoints Más Utilizados

```bash
# Health check
GET /api/v1/health

# Crear cita
POST /api/v1/citas

# Buscar persona
GET /api/v1/citas/buscar-persona?tipo_documento=CC&numero_documento=123

# Listar citas
GET /api/v1/citas

# Obtener cita específica
GET /api/v1/citas/:id

# Confirmar cita
POST /api/v1/citas/:id/confirmar

# Cancelar cita
POST /api/v1/citas/:id/cancelar

# Reagendar cita
POST /api/v1/citas/:id/reagendar

# Notificaciones no leídas
GET /api/v1/notificaciones?id_rol=2
```

## 7. Siguientes Pasos

1. Lee la documentación completa en `ENDPOINTS.md`
2. Consulta `README.md` para información detallada
3. Revisa los modelos en `src/models/`
4. Explora los servicios en `src/services/`
5. Personaliza validadores en `src/validators/`

## 8. Recursos Adicionales

- **Logs**: Ubicados en `logs/` (error.log, combined.log)
- **Configuración**: `src/config/`
- **Base de datos**: `database/`
- **Documentación API**: `ENDPOINTS.md`

## 9. Soporte

Para reportar problemas o solicitar ayuda, contacta al equipo de desarrollo de Inmotech.

---

**¡Listo!** Tu API está funcionando y lista para integrarse con el frontend de Inmotech. 🚀
