---
id: T03
parent: S03
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/src/lib/nav/menu.ts", "app/src/lib/adminMenu.ts", "app/src/lib/teacherMenu.ts", "app/src/app/admin/page.tsx", "app/src/app/admin/subjects/page.tsx"]
key_decisions: ["Adopción incremental: comenzar por admin y mantener shims de compatibilidad para no romper imports existentes.", "Usar roles del session como fuente primaria (opción A) y alimentar menuGroups desde el single source."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- `cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs`
- Browser: login admin -> /admin -> navigate /admin/subjects -> texto 'Materias' visible
- `cd app && npm test`
"
completed_at: 2026-03-27T20:32:37.247Z
blocker_discovered: false
---

# T03: Empecé la adopción del single source: reemplacé menús duplicados en admin y mantuve compatibilidad vía shims; verifiqué navegación a /admin/subjects con menú nuevo.

> Empecé la adopción del single source: reemplacé menús duplicados en admin y mantuve compatibilidad vía shims; verifiqué navegación a /admin/subjects con menú nuevo.

## What Happened
---
id: T03
parent: S03
milestone: M007
key_files:
  - app/src/lib/nav/menu.ts
  - app/src/lib/adminMenu.ts
  - app/src/lib/teacherMenu.ts
  - app/src/app/admin/page.tsx
  - app/src/app/admin/subjects/page.tsx
key_decisions:
  - Adopción incremental: comenzar por admin y mantener shims de compatibilidad para no romper imports existentes.
  - Usar roles del session como fuente primaria (opción A) y alimentar menuGroups desde el single source.
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:32:37.248Z
blocker_discovered: false
---

# T03: Empecé la adopción del single source: reemplacé menús duplicados en admin y mantuve compatibilidad vía shims; verifiqué navegación a /admin/subjects con menú nuevo.

**Empecé la adopción del single source: reemplacé menús duplicados en admin y mantuve compatibilidad vía shims; verifiqué navegación a /admin/subjects con menú nuevo.**

## What Happened

Se eligió el enfoque A (roles del session) pero con una adopción incremental para no tocar 40+ archivos a ciegas. Primero se creó compatibilidad retroactiva: `adminMenu.ts` y `teacherMenu.ts` ahora son shims que delegan al nuevo `getMenuGroupsForRoles()` para mantener imports existentes.

Luego se migró una página representativa (`/admin` y `/admin/subjects`) a consumir el menú single source vía `getMenuGroupsForRoles(['admin'])`, preservando la lógica de badges en el dashboard admin (useMemo) y eliminando duplicación local. Durante el cambio se corrigió un error de edición: al reemplazar el bloque parcial, quedó basura del array legacy en `admin/subjects/page.tsx`, así que se reescribió el archivo completo para quedar consistente.

Smoke manual en browser: tras correr seed, login admin redirige a /admin y navegar a /admin/subjects muestra la página 'Materias' con el nuevo menú. También se corrió `npm test` y pasó.


## Verification

- `cd app && node --import tsx scripts/seed.mjs && node scripts/seed-check.mjs`
- Browser: login admin -> /admin -> navigate /admin/subjects -> texto 'Materias' visible
- `cd app && npm test`


## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd app && npm test` | 0 | ✅ pass | 177900ms |
| 2 | `Browser smoke: /admin/subjects shows 'Materias' after login + seed` | 0 | ✅ pass | 30000ms |


## Deviations

Se hizo migración incremental (solo /admin y /admin/subjects) en vez de migrar todas las páginas en una sola pasada, para reducir riesgo y permitir smoke verificable por pasos.

## Known Issues

Queda trabajo: migrar el resto de páginas admin/director/teacher/parent/student que aún definen `const menuGroups = [...]` o usan `menuGroups={[]}` (especialmente student).

## Files Created/Modified

- `app/src/lib/nav/menu.ts`
- `app/src/lib/adminMenu.ts`
- `app/src/lib/teacherMenu.ts`
- `app/src/app/admin/page.tsx`
- `app/src/app/admin/subjects/page.tsx`


## Deviations
Se hizo migración incremental (solo /admin y /admin/subjects) en vez de migrar todas las páginas en una sola pasada, para reducir riesgo y permitir smoke verificable por pasos.

## Known Issues
Queda trabajo: migrar el resto de páginas admin/director/teacher/parent/student que aún definen `const menuGroups = [...]` o usan `menuGroups={[]}` (especialmente student).
