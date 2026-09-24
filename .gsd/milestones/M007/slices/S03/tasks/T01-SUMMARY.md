---
id: T01
parent: S03
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/src/components/DashboardLayout.tsx", "app/src/app/** (múltiples páginas con const menuGroups)"]
key_decisions: ["El single source debe ser un módulo TS consumido por páginas, porque hoy los menuGroups están duplicados a nivel de page/client components."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Búsqueda por ripgrep de `menuGroups`/`const menuGroups` y lectura del componente `DashboardLayout` para confirmar responsabilidades."
completed_at: 2026-03-27T20:21:49.161Z
blocker_discovered: false
---

# T01: Inventarié los menús: `menuGroups` está duplicado en muchas páginas; `DashboardLayout` solo renderiza y no centraliza por rol.

> Inventarié los menús: `menuGroups` está duplicado en muchas páginas; `DashboardLayout` solo renderiza y no centraliza por rol.

## What Happened
---
id: T01
parent: S03
milestone: M007
key_files:
  - app/src/components/DashboardLayout.tsx
  - app/src/app/** (múltiples páginas con const menuGroups)
key_decisions:
  - El single source debe ser un módulo TS consumido por páginas, porque hoy los menuGroups están duplicados a nivel de page/client components.
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:21:49.163Z
blocker_discovered: false
---

# T01: Inventarié los menús: `menuGroups` está duplicado en muchas páginas; `DashboardLayout` solo renderiza y no centraliza por rol.

**Inventarié los menús: `menuGroups` está duplicado en muchas páginas; `DashboardLayout` solo renderiza y no centraliza por rol.**

## What Happened

Se inventarió la navegación actual. `DashboardLayout` es un componente presentacional que recibe `menuGroups` como prop; no decide por rol. La definición de `menuGroups` está duplicada en múltiples páginas por rol (admin/director/teacher/parent/student), con docenas de `const menuGroups = [...]` en archivos individuales y algunos casos con `menuGroups={[]} `. También hay constantes `ADMIN_MENU_GROUPS` / `TEACHER_MENU_GROUPS` en algunos clients, lo que indica una duplicación parcial por rol.

Conclusión: el single source debe vivir en un módulo de `src/lib` (p.ej. `src/lib/nav/menu.ts`) y las páginas deben consumirlo (idealmente con `getMenuGroupsForRoles(session.user.roles)` o un helper por ruta/rol).

## Verification

Búsqueda por ripgrep de `menuGroups`/`const menuGroups` y lectura del componente `DashboardLayout` para confirmar responsabilidades.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `rg -n "menuGroups" ... + read DashboardLayout.tsx` | 0 | ✅ pass | 1ms |


## Deviations

Ninguna.

## Known Issues

Hay muchas páginas student que pasan menuGroups={[]} (menú incompleto/inconsistente) y varias páginas duplican el mismo menú por rol. Esto se resolverá adoptando un source único en T02/T03.

## Files Created/Modified

- `app/src/components/DashboardLayout.tsx`
- `app/src/app/** (múltiples páginas con const menuGroups)`


## Deviations
Ninguna.

## Known Issues
Hay muchas páginas student que pasan menuGroups={[]} (menú incompleto/inconsistente) y varias páginas duplican el mismo menú por rol. Esto se resolverá adoptando un source único en T02/T03.
