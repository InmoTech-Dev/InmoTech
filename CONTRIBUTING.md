# 🤝 Guía de Contribución — InmoTech

## 👥 Equipo
| Nombre | Rama personal | Rol |
|---|---|---|
| Pablo | `Develop` / `main` | Líder |
| Navia | `navia` | Desarrollador |
| Jeronimo | `jeronimo` | Desarrollador |
| Chalarca | `chalarca` | Desarrollador |

---

## 🌿 Flujo de trabajo

navia / jeronimo / chalarca → PR → Develop → PR → main


1. Trabaja siempre en tu rama personal
2. Antes de empezar, actualiza tu rama con `Develop`:
   ```bash
   git checkout tu-rama
   git merge Develop
   ```
3. Haz commits con mensajes descriptivos
4. Sube tus cambios:
   ```bash
   git push origin tu-rama
   ```
5. Abre un PR desde tu rama hacia `Develop` en GitHub
6. Espera que un compañero apruebe tu PR

---

## 📝 Convención de commits

| Prefijo | Cuándo usarlo | Ejemplo |
|---|---|---|
| `feat:` | Nueva funcionalidad | `feat: agrega módulo de propiedades` |
| `fix:` | Corrección de bug | `fix: corrige error en login` |
| `chore:` | Configuración o dependencias | `chore: actualiza dependencias` |
| `docs:` | Documentación | `docs: actualiza README` |
| `refactor:` | Refactorización | `refactor: limpia controlador de citas` |
| `style:` | Cambios de UI o estilos | `style: ajusta colores del dashboard` |

---

## 🚫 Reglas obligatorias

- ❌ Nunca hacer push directo a `Develop` o `main`
- ❌ Nunca subir archivos `.env` o contraseñas
- ❌ No hacer PRs con más de 400 líneas de cambios — divídelos
- ❌ No mergear tu propio PR sin aprobación

---

## ✅ Antes de abrir un PR

- Tu rama está actualizada con `Develop`
- El código corre sin errores localmente
- Llenaste el template del PR completamente
- No hay `console.log` innecesarios en el código

---

## 🆘 ¿Tienes un conflicto?

```bash
git checkout tu-rama
git merge Develop
# Resuelve los conflictos en tu editor
git add .
git commit -m "fix: resuelve conflictos con Develop"
git push origin tu-rama
```