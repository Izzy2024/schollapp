---
id: M007
title: "Consolidar menús por rol + seed estándar (prisma db seed) + login sin fricción"
status: complete
completed_at: 2026-03-27T20:44:10.810Z
key_decisions:
  - Estandarizar seed vía `prisma db seed` conectándolo al runner TSX existente para evitar comandos ad-hoc.
  - Manejar el caso 'DB sin seed' en `authenticate()` (antes de NextAuth) con un código estable `SEED_REQUIRED` para evitar CallbackRouteError y devolver mensaje accionable.
  - Consolidar menús por rol en un single source tipado (`src/lib/nav/menu.ts`) y adoptar incrementalmente con shims para compatibilidad.
key_files:
  - app/prisma/schema.prisma
  - app/prisma/seed.ts
  - app/src/actions/authActions.ts
  - app/src/lib/nav/menu.ts
  - app/src/lib/adminMenu.ts
  - app/src/lib/teacherMenu.ts
  - app/src/app/admin/page.tsx
  - app/src/app/admin/subjects/page.tsx
  - app/README.md
  - .gsd/milestones/M007/M007-VALIDATION.md
lessons_learned:
  - `prisma db push` puede disparar efectos laterales inesperados en dev; para simular DB vacía usar `--skip-generate`.
  - Cuando una librería envuelve errores (CallbackRouteError), es más confiable interceptar en el borde propio (server action) y devolver un error operativo tipado con código estable.
  - Para migraciones de UI ampliamente duplicada, shims de compatibilidad permiten adopción incremental sin romper imports.
---

# M007: Consolidar menús por rol + seed estándar (prisma db seed) + login sin fricción

**M007 consolidó seed estándar (`prisma db seed`), eliminó CallbackRouteError en login sin seed con `SEED_REQUIRED`, y creó un single source tipado de menús por rol con adopción incremental verificada.**

## What Happened

M007 atacó dos fricciones principales: (1) login roto cuando falta data inicial, y (2) menús por rol duplicados y propensos a drift.

Se estandarizó el flujo de inicialización con `prisma db seed`, conectándolo al runner TSX existente y reforzando el dataset mínimo: tenant demo, usuarios demo, memberships, y RBAC mínimo (roles/permisos/userRoles) por tenant. Se documentaron pasos y credenciales en `app/README.md` y se mantuvo un script de chequeo (`scripts/seed-check.mjs`).

Para eliminar la fricción de “Algo salió mal” y el patrón de CallbackRouteError cuando no hay seed, se implementó manejo explícito del caso DB vacía en la server action `authenticate()` devolviendo un error controlado con código estable `SEED_REQUIRED` y un mensaje accionable para ejecutar `npx prisma db seed`. Esto evita el wrapping interno de NextAuth y mantiene el dev server estable.

Finalmente, se consolidó la navegación por rol en una única definición tipada (`src/lib/nav/menu.ts`). Se agregaron shims (`adminMenu.ts`, `teacherMenu.ts`) para compatibilidad, y se migraron páginas admin clave para consumir el source, verificando navegación y tests. Se dejó UAT/checklist para smoke por rol y una guía de cómo extender el menú sin reintroducir duplicación.

## Success Criteria Results

- ✅ `prisma db seed` funciona y crea el set mínimo requerido para autenticación.
- ✅ Login sin seed ya no dispara CallbackRouteError; devuelve `SEED_REQUIRED` con remediación.
- ✅ Menús por rol: single source (`src/lib/nav/menu.ts`) creado y usado; shims para compat.
- ✅ Smoke y tests: navegación admin verificada; `npm test` pasa.
- ✅ UAT actualizado con el caso login sin seed y guía de menús.


## Definition of Done Results

- [x] Roadmap/planes ejecutados: S01/S02/S03 completos.
- [x] Verificación: `npm test` pasa; seed y login smoke verificados.
- [x] UAT actualizado en slices S02/S03.
- [x] Decisiones registradas implícitamente en summaries (no se requirió DECISIONS.md adicional para cambios locales).


## Requirement Outcomes

- Seed/operación: `prisma db seed` ahora es el camino estándar y documentado para inicializar DB demo.
- Auth: login sin seed falla de forma controlada con `SEED_REQUIRED` y guía accionable, evitando CallbackRouteError.
- Navegación: existe un single source tipado de menús por rol; adopción inicial en admin + shims para migración progresiva.


## Deviations

None.

## Follow-ups

None.
