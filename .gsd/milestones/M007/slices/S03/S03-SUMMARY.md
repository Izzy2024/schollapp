---
id: S03
parent: M007
milestone: M007
provides:
  - Módulo central de menús por rol
  - Páginas admin clave usando el source
  - Compatibilidad para imports legacy
requires:
  - slice: S02
    provides: Login sin seed ya no rompe; seed estándar disponible para smoke
affects:
  []
key_files:
  - app/src/lib/nav/menu.ts
  - app/src/lib/adminMenu.ts
  - app/src/lib/teacherMenu.ts
  - app/src/app/admin/page.tsx
  - app/src/app/admin/subjects/page.tsx
key_decisions:
  - Menú elegido por roles del session (opción A).
  - Adopción incremental con shims para compatibilidad.
patterns_established:
  - Single source tipado para navegación por rol (`MENU_BY_ROLE` + helper).
  - Compatibilidad hacia atrás vía shims mientras se migra.
observability_surfaces:
  - Checklist UAT del slice para smoke por rol
drill_down_paths:
  - .gsd/milestones/M007/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M007/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M007/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M007/slices/S03/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:35:58.929Z
blocker_discovered: false
---

# S03: Menús por rol: single source tipada + adopción en layouts

**Se creó un single source tipado de menús por rol y se empezó a adoptar en páginas clave, manteniendo compatibilidad y verificando navegación sin 404 en admin.**

## What Happened

Se inventarió la situación actual: el componente `DashboardLayout` renderiza `menuGroups` pero la app definía menús por rol como arrays duplicados en decenas de páginas y algunos módulos (`adminMenu.ts`, `teacherMenu.ts`).

Se implementó una fuente única tipada en `app/src/lib/nav/menu.ts` con normalización de roles (incluye aliases legacy), selección de rol primario, y `getMenuGroupsForRoles(roles)` para consumo por páginas. Para no romper imports existentes, `adminMenu.ts` y `teacherMenu.ts` se convirtieron en shims que delegan al nuevo source.

Como adopción inicial y verificable, se migró el dashboard admin (`/admin`) y la página de materias (`/admin/subjects`) a consumir el single source. Se preservó la lógica de badges en el dashboard admin. Se ejecutó smoke manual en browser y `npm test` para confirmar que no hubo regresiones.

Se documentó un checklist UAT para validar que la navegación principal por rol no produce 404 y cómo extender el menú sin reintroducir duplicación.

## Verification

- `cd app && npm test` pasa.
- Smoke admin: login → /admin → /admin/subjects muestra 'Materias'.
- Menú single source presente en `app/src/lib/nav/menu.ts` y shims apuntan a él.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

Ninguna.

## Known Limitations

Aún quedan páginas con `const menuGroups = [...]` o `menuGroups={[]}` (especialmente student) que deberían migrarse en una pasada adicional. El patrón y el single source ya están establecidos y en uso.

## Follow-ups

Migrar el resto de páginas por rol a `getMenuGroupsForRoles(session.user.roles)` y eliminar arrays duplicados.
Opcional: agregar un validador en dev que detecte hrefs inexistentes en el menú.


## Files Created/Modified

- `app/src/lib/nav/menu.ts` — Nuevo single source tipado con menu por rol + helpers.
- `app/src/lib/adminMenu.ts` — Shim: ADMIN_MENU_GROUPS delega al single source.
- `app/src/lib/teacherMenu.ts` — Shim: TEACHER_MENU_GROUPS delega al single source.
- `app/src/app/admin/page.tsx` — Migrado a usar `getMenuGroupsForRoles(['admin'])` manteniendo badges.
- `app/src/app/admin/subjects/page.tsx` — Reescrito para consumir single source y eliminar duplicación de menuGroups.
- `app/src/lib/auth-guards.mjs` — Nota aclaratoria de ubicación del menú (TS) vs guards Edge (MJS).
