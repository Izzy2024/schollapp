---
status: done
milestone: M003
title: Finanzas, Comunicación y Lanzamiento
completed_at: 2026-03-23T15:35:00-05:00
slices:
  - id: S01
    status: done
    title: Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin
  - id: S02
    status: done
    title: Registro manual de pagos + Estado de cuenta Parent (real, no mock)
  - id: S03
    status: done
    title: Observabilidad financiera (ActivityEvent) + superficie de auditoría
  - id: S04
    status: done
    title: Estabilización (lint/types/build) + suite de verificación sin mock.module
  - id: S05
    status: done
    title: Integración final “Lanzamiento” (happy path + failure visibility)
verification:
  gates:
    lint: pass
    test: pass
    build: pass
  runtime_smoke:
    - admin creates finance concept, generates charges, records manual payment
    - admin activity feed shows finance.* events with parse-safe metadata
    - parent finances page loads using seeded guardian linkage (fallback by email when guardianId missing in session)
notes:
  - Dev demo is deterministic but requires running db:reset + db:seed before login; otherwise Credentials authorize fails ("Usuario no encontrado o inactivo").
---

# M003 Summary — Finanzas, Comunicación y Lanzamiento

## Outcome
M003 cierra un MVP de **finanzas básicas** con flujo Admin/Director y superficie Parent, con **aislamiento tenant** y **RBAC** derivados de sesión, y con **trazabilidad** mediante `ActivityEvent` (`finance.*`). El repositorio queda **lanzable** con gates en verde.

## What is now true (Success Criteria)
- Admin/Director puede:
  - crear conceptos de cobro
  - generar cargos por periodo de forma idempotente
  - registrar pagos manuales
- Parent/Tutor puede ver `/parent/finances` con datos reales (cargos/pagos) calculados desde DB.
- Mutaciones financieras emiten eventos `finance.*` visibles en Activity.
- `pnpm -C app lint`, `pnpm -C app test`, `pnpm -C app build` pasan.

## Key implementation notes
- `getForParent()` (finance statements) requiere resolver estudiantes visibles via `Guardian`.
  - Para demo dev seeded, se agregó fallback: si `session.user.guardianId` no existe, se resuelve por `Guardian.email == session.user.email` (tenant-scoped).
- La demo runtime depende de DB seeded:
  - `pnpm -C app run db:reset` (incluye prisma generate)
  - `pnpm -C app run db:seed`

## Evidence
- Slice-level evidence and runbook:
  - `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md`
  - `.gsd/milestones/M003/slices/S05/S05-SUMMARY.md`
