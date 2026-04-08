# S02: Login sin seed: error manejado + mensaje accionable (no CallbackRouteError) — UAT

**Milestone:** M007
**Written:** 2026-03-27T20:20:34.830Z

## UAT — S02: Login sin seed

### Precondición
- Base de datos inicializada (schema) pero sin data demo (sin seed).

### Pasos
1. Arranca la app en dev.
2. Ir a `/login`.
3. Intentar iniciar sesión con cualquier usuario demo (p.ej. `admin@demo.com`).

### Esperado (sin seed)
- No debe crashear el dev server.
- Debe mostrarse un error **accionable** con el código:
  - `SEED_REQUIRED: Base sin datos iniciales. Ejecuta: npx prisma db seed`

### Remediación
1. Ejecutar:
   - `cd app`
   - `npx prisma db seed`
2. Reintentar login.

### Esperado (con seed)
- Login redirige al dashboard correspondiente (admin → `/admin`).
