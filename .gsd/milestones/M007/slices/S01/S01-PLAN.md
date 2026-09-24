# S01: Seed estándar: prisma db seed + dataset mínimo para auth

**Goal:** Establecer un seed idempotente y documentado como única vía para inicializar data requerida por autenticación.
**Demo:** After this: `prisma db seed` en DB vacía; luego login funciona con usuario seeded.

## Tasks
- [x] **T01: Inventarié el flujo de auth y confirmé las dependencias mínimas de DB para login y resolución de rol.** — - Localizar flujo de login/auth (NextAuth o equivalente), callbacks, y queries a DB.
- Identificar qué tablas/relaciones se asumen existentes (roles, usuarios, estados).
- Definir dataset mínimo para un login exitoso por rol.
- Documentar hallazgos para orientar T03 y S02.

  - Estimate: 1-2h
  - Files: app/src/auth.ts, app/src/auth.config.ts, app/src/lib/prisma.ts, app/src/app/**/login*, app/src/middleware.ts, app/prisma/schema.prisma, app/prisma/seed.ts
  - Verify: - Identificar el punto exacto donde se produce el error cuando no hay seed.
- Listar las entidades mínimas requeridas para un authorize exitoso.

- [x] **T02: Configuré Prisma para soportar `prisma db seed` y lo conecté al runner existente basado en tsx.** — - Configurar Prisma seed (package.json y/o prisma schema) para `prisma db seed`.
- Asegurar que el script seed es idempotente (upsert por email/slug/clave natural).
- Manejar transacción si aplica y orden de creación.
- No loggear secretos.

  - Estimate: 2-4h
  - Files: app/package.json, app/prisma/schema.prisma, app/prisma/seed.ts
  - Verify: cd app && npx prisma db seed
- [x] **T03: Añadí RBAC mínimo al seed: permissions/roles/userRoles para que auth y menús por rol dependan de DB y no de heurísticas por email.** — - Extender seed para crear roles/permisos necesarios.
- Crear usuarios activos por rol con credenciales de dev (documentadas, no secretas).
- Si hay constraints especiales (estado, schoolId, etc.), cubrirlas.
- Verificar que roles DB existen (no solo fallback por email).

  - Estimate: 2-4h
  - Files: app/prisma/seed.ts
  - Verify: cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs
- [x] **T04: Documenté el flujo de seed recomendado, credenciales demo y troubleshooting básico en la documentación principal de la app.** — - Actualizar README o doc UAT con pasos:
  - `npx prisma migrate dev` (si aplica)
  - `npx prisma db seed`
  - credenciales de dev
  - cómo reconocer DB vacía

  - Estimate: 30-60m
  - Files: README.md, .gsd/milestones/M007/** (si se agrega doc)
  - Verify: Releer doc y ejecutar pasos desde cero en un entorno limpio
