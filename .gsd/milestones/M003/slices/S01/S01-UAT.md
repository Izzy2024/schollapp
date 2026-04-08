# S01 UAT: Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin (M003)

## Objetivo
Validar que el Admin puede crear conceptos y generar cargos **idempotentes** (sin duplicados por periodo), base del estado de cuenta.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado (usuarios demo). Nota: `node app/prisma/seed.ts`.
- Login Admin: `admin@demo.com` / `demo-hash-123`

## Caso 1 — Crear concepto mensual
1. Ir a `/admin/finances`.
2. Crear concepto "Colegiatura" (mensual) con monto (ej. 1000).
3. Expected: aparece en lista de conceptos activos.

## Caso 2 — Generar cargos para un periodo (idempotente)
1. En el mismo módulo, elegir periodo (ej. mes actual o un `periodKey` que el UI soporte).
2. Ejecutar "Generar cargos".
3. Expected: se crean cargos para alumnos (tabla/lista de cargos).
4. Repetir "Generar cargos" para el mismo periodo.
5. Expected: **no** se duplican cargos (los conteos/montos no se inflan).

## Caso 3 — Señales de fallo
- Al refrescar la página, aparecen cargos duplicados del mismo periodo para el mismo alumno.
- Se permite generar cargos fuera del tenant (no debería).

## Notas
- El contrato de dedupe está respaldado por unique key + tests contract (ver `finance` contract tests).