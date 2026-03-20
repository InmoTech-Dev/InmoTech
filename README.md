<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=InmoTech+Logo" alt="InmoTech Logo" width="150"/>
  <h1>InmoTech</h1>
  <p>🏢 <strong>Plataforma Integral de Gestión Inmobiliaria</strong> 🏢</p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue)](https://reactjs.org/)
  [![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](https://nodejs.org/)
  
  <p>
    <a href="#-sobre-el-proyecto">Sobre el proyecto</a> •
    <a href="#-características">Características</a> •
    <a href="#-tecnologías-utilizadas">Tecnologías</a> •
    <a href="#-estructura-del-proyecto">Estructura</a> •
    <a href="#-instalación-y-uso">Instalación</a>
  </p>
</div>

---

## 📖 Sobre el Proyecto

**InmoTech** es un sistema moderno para la gestión inmobiliaria, diseñado para simplificar el flujo de trabajo de agentes y administradores. Este repositorio contiene tanto el panel web frontend (construido con React y Vite) como el servidor backend API (construido con Node.js y Express).

Con InmoTech puedes gestionar propiedades, citas, usuarios, y flujos administrativos desde una sola plataforma optimizada y segura.

---

## ✨ Características

- 🔐 **Autenticación Segura:** Sistema robusto de JWT con acceso basado en roles (Administradores, Agentes, Clientes).
- 🏘️ **Gestión de Propiedades:** CRUD completo de propiedades, galerías de imágenes, características y disponibilidad.
- 📅 **Sistema de Citas:** Programación dinámica de visitas, prevención de solapamiento de horarios (30 min), y manejo de estado.
- 📊 **Panel Administrativo:** Tablero con reportes e indicadores clave para facilitar la toma de decisiones.
- 📩 **Notificaciones:** Integración con envíos de correo para confirmación de actividades.
- 📱 **Diseño Responsivo:** Interfaz diseñada pensando tanto en escritorios como dispositivos móviles mediante Tailwind CSS.

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnología |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Axios, React Hook Form, Zod, Recharts, Lucide React |
| **Backend** | Node.js, Express, Sequelize, Tedious (SQL Server), JWT, Bcryptjs, Multer, Cloudinary, Nodemailer |
| **Herramientas** | ESLint, Jest (Testing), Docker, Morgan, Winston |

---

## 📂 Estructura del Proyecto

El proyecto sigue una arquitectura de monorepo simplificada separando el cliente de la API:

```text
InmoTech/
├── api/                   # Backend Node.js / Express
│   ├── src/               # Código fuente del servidor
│   │   ├── controllers/   # Lógica y controladores de la API
│   │   ├── models/        # Modelos de Base de Datos y Schemas
│   │   ├── routes/        # Definición de Endpoints
│   │   ├── services/      # Lógica de negocio profunda y utilidades
│   │   └── server.js      # Punto de entrada de la aplicación
│   ├── package.json       # Dependencias del API
│   └── ...
├── frontend/              # Panel web de administración React
│   ├── src/               # Código fuente de React
│   │   ├── components/    # Componentes UI reutilizables
│   │   ├── pages/         # Vistas / Pantallas completas
│   │   ├── utils/         # Funciones auxiliares
│   │   ├── App.jsx        # Componente principal
│   │   └── main.jsx       # Punto de entrada de Vite
│   ├── package.json       # Dependencias del Frontend
│   └── tailwind.config.js # Configuración de Tailwind CSS
└── .gitignore             # Ignorar archivos no deseados de git
```

---

## 🚀 Instalación y Uso

Sigue estos pasos para levantar el entorno de desarrollo de forma local.

### Prerrequisitos

- **Node.js** (v18 o superior recomendado)
- **NPM** o **Yarn**
- Relational Database como **SQL Server** o el motor configurado en tu `api/.env`

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/InmoTech.git
   cd InmoTech
   ```

2. **Configuración del Backend (API)**
   ```bash
   cd api
   npm install
   # Crea y rellena tu archivo .env basado en el .env.example
   cp .env.example .env
   # Ejecuta el servidor en modo desarrollo
   npm run dev
   ```

3. **Configuración del Frontend**
   Abre una nueva terminal en la raíz del proyecto.
   ```bash
   cd frontend
   npm install
   # Ejecuta el panel de React
   npm run dev
   ```

El frontend estará disponible normalmente en `http://localhost:5173/` y la API en el puerto configurado (ej. `http://localhost:3000/`).

---

## 📜 Licencia

Este proyecto está bajo la Licencia **MIT**. Para más detalles, revisa el archivo `LICENSE`.

---
<div align="center">
  Hecho con ❤️ por el <b>Inmotech Development Team</b>.
</div>
