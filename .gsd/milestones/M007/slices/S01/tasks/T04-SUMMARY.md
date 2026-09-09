---
id: T04
parent: S01
milestone: M007
provides: []
requires: []
affects: []
key_files: ["app/README.md"]
key_decisions: ["Centralizar la guía operativa en `app/README.md` (más cercano al runtime) en lugar del README raíz."]
patterns_established: []
drill_down_paths: []
observability_surfaces: []
duration: ""
verification_result: "Revisión manual del contenido actualizado en `app/README.md` y ejecución de `npx prisma db seed` previamente verificada en T02/T03."
completed_at: 2026-03-27T20:00:42.765Z
blocker_discovered: false
---

# T04: Documenté el flujo de seed recomendado, credenciales demo y troubleshooting básico en la documentación principal de la app.

> Documenté el flujo de seed recomendado, credenciales demo y troubleshooting básico en la documentación principal de la app.

## What Happened
---
id: T04
parent: S01
milestone: M007
key_files:
  - app/README.md
key_decisions:
  - Centralizar la guía operativa en `app/README.md` (más cercano al runtime) en lugar del README raíz.
duration: ""
verification_result: passed
completed_at: 2026-03-27T20:00:42.766Z
blocker_discovered: false
---

# T04: Documenté el flujo de seed recomendado, credenciales demo y troubleshooting básico en la documentación principal de la app.

**Documenté el flujo de seed recomendado, credenciales demo y troubleshooting básico en la documentación principal de la app.**

## What Happened

Se actualizó `app/README.md` para incluir el paso explícito `npx prisma db seed` como recomendación antes de intentar login/demos, además de listar credenciales demo y password determinista. Esto reduce la fricción operativa y sirve como guía para el caso 'DB vacía'.

## Verification

Revisión manual del contenido actualizado en `app/README.md` y ejecución de `npx prisma db seed` previamente verificada en T02/T03.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `Doc review + seed already verified in prior tasks` | 0 | ✅ pass | 1ms |


## Deviations

Ninguna.

## Known Issues

Ninguno.

## Files Created/Modified

- `app/README.md`


## Deviations
Ninguna.

## Known Issues
Ninguno.
