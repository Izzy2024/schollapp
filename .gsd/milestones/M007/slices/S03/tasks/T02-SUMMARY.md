---
id: T02
parent: S03
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/src/lib/nav/menu.ts", "app/src/lib/auth-guards.mjs"]
key_decisions: ["Mantener `auth-guards.mjs` como Edge-safe y no importarlo desde TS para evitar problemas en middleware; el menú queda en TS para uso en páginas."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Revisión estática del módulo y compilación incremental del dev server (sin errores en logs tras escribir el archivo)."
completed_at: 2026-03-27T20:24:06.811Z
blocker_discovered: false
---

# T02: Creé un single source tipado de menús por rol en `src/lib/nav/menu.ts` con helpers de normalización y selección de rol principal.

> Creé un single source tipado de menús por rol en `src/lib/nav/menu.ts` con helpers de normalización y selección de rol principal.

## What Happened
---
id: T02
parent: S03
milestone: M007
key_files:
  - app/src/lib/nav/menu.ts
  - app/src/lib/auth-guards.mjs
key_decisions:
  - Mantener `auth-guards.mjs` como Edge-safe y no importarlo desde TS para evitar problemas en middleware; el menú queda en TS para uso en páginas.
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:24:06.812Z
blocker_discovered: false
---

# T02: Creé un single source tipado de menús por rol en `src/lib/nav/menu.ts` con helpers de normalización y selección de rol principal.

**Creé un single source tipado de menús por rol en `src/lib/nav/menu.ts` con helpers de normalización y selección de rol principal.**

## What Happened

Se agregó `app/src/lib/nav/menu.ts` como fuente única para definir la navegación (sidebar) por rol. Incluye tipos (`RoleKey`, `MenuGroup`, `NavItem`), normalización de roles (incluye aliases legacy como docente/alumno/padre), selección de rol principal por prioridad, y `getMenuGroupsForRoles(roles)` para consumo directo por páginas/layouts. Se dejó una nota en `auth-guards.mjs` aclarando que el menú vive en TS y que el archivo .mjs se mantiene por compatibilidad Edge.

## Verification

Revisión estática del módulo y compilación incremental del dev server (sin errores en logs tras escribir el archivo).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Static review + dev server remained ready` | 0 | ✅ pass | 1ms |


## Deviations

Ninguna.

## Known Issues

Aún no está adoptado por las páginas; eso ocurre en T03. Los href se basan en rutas existentes; si alguna ruta no existe, se ajustará durante el smoke de T03.

## Files Created/Modified

- `app/src/lib/nav/menu.ts`
- `app/src/lib/auth-guards.mjs`


## Deviations
Ninguna.

## Known Issues
Aún no está adoptado por las páginas; eso ocurre en T03. Los href se basan en rutas existentes; si alguna ruta no existe, se ajustará durante el smoke de T03.
