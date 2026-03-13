# T01: Configuración de Autenticación Core (NextAuth/Iron-session)

**Slice:** S01
**Milestone:** M001

## Goal
Instalar y configurar la librería de autenticación base que conecte con Prisma y permita emitir sesiones (JWT/Cookies) que contengan el `tenantId` y los roles.

## Must-Haves

### Truths
- "Existe un adaptador o capa de auth que permite validar credenciales de DB."
- "El objeto de sesión de NextAuth (o auth.ts) expone el `tenantSlug`, `tenantId` y `roles` del usuario."

### Artifacts
- `app/package.json` — Debe incluir `next-auth` o `jose` (o librería de auth elegida).
- `app/src/lib/auth.ts` — (Mínimo 30 líneas, exporta `auth`, `signIn`, `signOut`).
- `app/src/app/api/auth/[...nextauth]/route.ts` — (Endpoint de Auth.js si se usa NextAuth).

### Key Links
- `auth.ts` → PrismaClient (`lib/prisma.ts`) para verificar al usuario.

## Steps
1. Revisar si hay alguna librería de auth preexistente en `package.json`.
2. Si no hay, instalar `next-auth@beta` (o la versión v5) / O usar `jose` para una solución manual de JWT según el ecosistema.
3. Crear `lib/auth.ts` implementando el Proveedor de Credenciales.
4. Conectar el proveedor a `prisma.user` (validar bcrypt/argon2 hash password).
5. Configurar el callback `jwt` y `session` para inyectar `tenantId` y `roles` del modelo `UserRole`/`UserMembership`.
6. Crear la ruta API para Auth.js si aplica.

## Context
- El esquema de Prisma ya tiene `User`, `UserMembership`, `Role` y `UserRole`.
- Necesitamos buscar la relación para meter en la sesión el contexto principal. Dado que el MVP es multi-tenant, si un usuario tiene varios tenants, en el login debería seleccionar uno (para T02), por ahora asociaremos el primer tenant que tenga para la sesión o dejaremos el campo preparado.