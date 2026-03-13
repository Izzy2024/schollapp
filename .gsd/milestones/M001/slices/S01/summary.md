---
id: S01
parent: M001
provides:
  - Autenticación real con NextAuth v5 usando base de datos (credenciales).
  - Middleware Edge que protege rutas privadas y enruta según el rol del usuario.
  - Extracción segura del tenant actual (`tenantSlug` y `tenantId`) usando el token JWT, protegiendo todos los endpoints de Server Actions contra suplantación.
requires: []
key_files:
  - app/src/auth.ts
  - app/src/middleware.ts
  - app/src/app/login/page.tsx
  - app/src/actions/*.ts
key_decisions:
  - "NextAuth con estrategia de JWT para permitir middleware de borde (Edge Runtime) rápido y protección en frío de rutas."
  - "En vez de eliminar el argumento 'tenantSlug' de todos los frontends y romper llamadas, se usó un patrón donde el Server Action recibe el parámetro pero lo sobreescribe ignorándolo a favor de 'session.user.tenantSlug'. Esto asegura que el frontend no pueda engañar al backend enviando un tenant falso."
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-summary.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-summary.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-summary.md
completed_at: 2026-03-11T23:25:00Z
---

# S01: RBAC y Multi-tenant Core

**Sistema base protegido con login, enrutamiento basado en rol y protección activa del tenant a nivel de API.**

## What Happened
Se instaló y configuró Auth.js (NextAuth v5 beta) junto a `bcryptjs` para implementar login mediante credenciales validando contra la tabla `User` de Prisma. La sesión JWT se enriqueció con `tenantId`, `tenantSlug` y `roles`. 

Se creó una página de inicio de sesión estilizada en `/login` que utiliza `useActionState` con Server Actions.

Se implementó un `middleware.ts` en modo Edge para interceptar el tráfico no autorizado y redirigirlo a `/login`. Al autorizarse, el middleware despacha dinámicamente al usuario a su panel de control correcto (`/admin`, `/director`, `/teacher`, etc.) basándose en sus roles.

Finalmente, para el aislamiento de datos (Multi-tenant), se inyectó de forma masiva en todos los Server Actions una capa de validación inicial (`const session = await auth(); tenantSlug = session.user.tenantSlug;`). Esto ignora cualquier intento del cliente de operar sobre un tenant que no sea el autorizado por el token JWT, garantizando seguridad sin obligar a rediseñar todo el front-end de forma inmediata.