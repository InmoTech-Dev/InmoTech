# Frontend con Vite

## Desarrollo local

Usa `frontend/.env.development` con:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_CSRF_COOKIE_NAME=csrfToken
VITE_CSRF_HEADER_NAME=X-CSRF-Token
```

Luego ejecuta:

```bash
cd frontend
npm install
npm run dev
```

## Producción

En Vercel, la variable requerida es:

```env
VITE_API_URL=https://inmotech-api.duckdns.org/api/v1
```

El proyecto ya resuelve la base URL desde `import.meta.env.VITE_API_URL` en `frontend/src/shared/config/runtime.js`, así que no debe existir ningún fallback hardcodeado en producción.
