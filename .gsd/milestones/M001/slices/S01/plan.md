# S01: RBAC y Multi-tenant Core

**Goal:** Implementar autenticación real, gestión de sesiones y control de acceso basado en roles (RBAC) con aislamiento por tenant.
**Demo:** Un usuario puede ir a `/login`, autenticarse, y entrar a su dashboard (Admin, Profesor, etc.) según su rol, y ver datos exclusivos de su colegio (`tenant`).

## Must-Haves
- `middleware.ts` bloquea acceso a rutas privadas y redirige a `/login` si no hay sesión.
- Página `/login` funcional que valida contra `User` en base de datos.
- La sesión guarda el `userId`, `tenantId`, `tenantSlug` y los roles del usuario.
- Los server actions y páginas extraen el `tenantSlug`/`tenantId` de la sesión en lugar de tener `'school-demo'` hardcodeado.

## Tasks

- [x] **T01: Configuración de Autenticación (NextAuth/Auth.js)**
  Instalar y configurar Auth.js (o equivalente manual con JWT/cookies) conectado a SQLite/Prisma usando credenciales.
  
- [x] **T02: Página de Login y Middleware**
  Crear la interfaz de inicio de sesión y el middleware para proteger las rutas `/admin`, `/teacher`, `/director`, etc.
  
- [x] **T03: Refactorización de Multi-Tenant (Eliminar hardcodes)**
  Actualizar layouts y server actions principales para leer el `tenantSlug` o `tenantId` de la sesión en vez del string hardcodeado `'school-demo'`.

## Files Likely Touched
- `app/package.json`
- `app/src/middleware.ts`
- `app/src/lib/auth.ts`
- `app/src/app/login/page.tsx`
- `app/src/actions/*.ts`
- `app/src/app/(roles)/layout.tsx`