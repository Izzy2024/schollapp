---
id: T04
parent: S03
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/src/lib/nav/menu.ts", "app/src/lib/adminMenu.ts", "app/src/lib/teacherMenu.ts", ".gsd/milestones/M007/slices/S03/S03-UAT.md"]
key_decisions: ["El menú se elige por roles del session (opción A)."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Revisión de UAT generado + smoke ya ejecutado en T03 para admin (/admin y /admin/subjects)."
completed_at: 2026-03-27T20:35:28.495Z
blocker_discovered: false
---

# T04: Documenté el single source de menús por rol y un checklist UAT de navegación por rol.

> Documenté el single source de menús por rol y un checklist UAT de navegación por rol.

## What Happened
---
id: T04
parent: S03
milestone: M007
key_files:
  - app/src/lib/nav/menu.ts
  - app/src/lib/adminMenu.ts
  - app/src/lib/teacherMenu.ts
  - .gsd/milestones/M007/slices/S03/S03-UAT.md
key_decisions:
  - El menú se elige por roles del session (opción A).
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:35:28.495Z
blocker_discovered: false
---

# T04: Documenté el single source de menús por rol y un checklist UAT de navegación por rol.

**Documenté el single source de menús por rol y un checklist UAT de navegación por rol.**

## What Happened

Se documentó la ubicación y uso del single source de menús (`app/src/lib/nav/menu.ts`), incluyendo cómo se normalizan roles y cómo consumir el helper `getMenuGroupsForRoles(roles)` desde páginas/layouts. También se agregó un checklist UAT para validar, por rol, que el sidebar renderiza items consistentes y que la navegación principal no produce 404. Se incluyeron credenciales demo y una nota sobre dependencias de seed para que el smoke sea reproducible.

## Verification

Revisión de UAT generado + smoke ya ejecutado en T03 para admin (/admin y /admin/subjects).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Doc review + prior smoke in T03` | 0 | ✅ pass | 1ms |


## Deviations

Ninguna.

## Known Issues

El crash/alert de dev server se debió a un endpoint que lanza `Tenant not found` cuando la DB no estaba seeded; se mitigó corriendo seed antes del smoke. Este caso ya está cubierto por S02 (SEED_REQUIRED).

## Files Created/Modified

- `app/src/lib/nav/menu.ts`
- `app/src/lib/adminMenu.ts`
- `app/src/lib/teacherMenu.ts`
- `.gsd/milestones/M007/slices/S03/S03-UAT.md`


## Deviations
Ninguna.

## Known Issues
El crash/alert de dev server se debió a un endpoint que lanza `Tenant not found` cuando la DB no estaba seeded; se mitigó corriendo seed antes del smoke. Este caso ya está cubierto por S02 (SEED_REQUIRED).
