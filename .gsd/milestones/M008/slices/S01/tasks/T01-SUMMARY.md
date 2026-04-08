---
id: T01
parent: S01
milestone: M008
provides: []
requires: []
affects: []
key_files: ["app/src/app/admin/enrollment/**", "app/src/app/teacher/classes/**", "app/src/lib/nav/menu.ts"]
key_decisions: ["Priorizar arreglar rutas del happy path antes de construir asistencia, porque hoy teacher no puede llegar a 'Mis Clases'."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "- Seed aplicado: `node --import tsx scripts/seed.mjs` + `node scripts/seed-check.mjs`.
- Browser: `/admin/enrollment` muestra `Página en construcción.`.
- Browser: `/teacher/classes` responde 404.
- Browser: `/teacher/classes/123` muestra error controlado `No se pudo cargar la clase`."
completed_at: 2026-03-27T21:13:33.215Z
blocker_discovered: false
---

# T01: Mapeé el happy path demo y encontré los primeros bloqueos: /admin/enrollment está en construcción y /teacher/classes da 404.

> Mapeé el happy path demo y encontré los primeros bloqueos: /admin/enrollment está en construcción y /teacher/classes da 404.

## What Happened
---
id: T01
parent: S01
milestone: M008
key_files:
  - app/src/app/admin/enrollment/**
  - app/src/app/teacher/classes/**
  - app/src/lib/nav/menu.ts
key_decisions:
  - Priorizar arreglar rutas del happy path antes de construir asistencia, porque hoy teacher no puede llegar a 'Mis Clases'.
duration: ""
verification_result: passed
completed_at: 2026-03-27T21:13:33.217Z
blocker_discovered: false
---

# T01: Mapeé el happy path demo y encontré los primeros bloqueos: /admin/enrollment está en construcción y /teacher/classes da 404.

**Mapeé el happy path demo y encontré los primeros bloqueos: /admin/enrollment está en construcción y /teacher/classes da 404.**

## What Happened

Se ejecutó exploración E2E en browser con DB seeded.

Admin:
- Login admin OK → /admin.
- Navegación a `/admin/enrollment` carga pero muestra explícitamente `Página en construcción.` (placeholder). Esto bloquea el paso “inscripción” del happy path.

Teacher:
- Login teacher OK → /teacher.
- El menú enlaza a `/teacher/classes`, pero esa ruta responde 404 (page not found). Esto bloquea el paso “teacher ve su clase”.
- Al navegar a un detalle manual `/teacher/classes/123`, la app muestra una página de error controlada `No se pudo cargar la clase`, pero sin listado navegable.

Conclusión: antes de trabajar asistencia, hay dos gaps de alto impacto:
1) Implementar mínima UI/acción en `/admin/enrollment` (reemplazar placeholder).
2) Implementar `/teacher/classes` (listado) y su navegación a detalles reales (sectionSubjectId).

## Verification

- Seed aplicado: `node --import tsx scripts/seed.mjs` + `node scripts/seed-check.mjs`.
- Browser: `/admin/enrollment` muestra `Página en construcción.`.
- Browser: `/teacher/classes` responde 404.
- Browser: `/teacher/classes/123` muestra error controlado `No se pudo cargar la clase`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Browser: /admin/enrollment placeholder + /teacher/classes 404` | 0 | ✅ pass (gaps confirmed) | 30000ms |


## Deviations

Ninguna.

## Known Issues

El menú teacher incluye un href a `/teacher/classes` pero esa ruta no existe, generando 404 (regresión UX importante para demo).

## Files Created/Modified

- `app/src/app/admin/enrollment/**`
- `app/src/app/teacher/classes/**`
- `app/src/lib/nav/menu.ts`


## Deviations
Ninguna.

## Known Issues
El menú teacher incluye un href a `/teacher/classes` pero esa ruta no existe, generando 404 (regresión UX importante para demo).
