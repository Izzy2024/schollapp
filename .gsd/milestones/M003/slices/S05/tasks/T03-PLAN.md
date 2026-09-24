---
estimated_steps: 7
estimated_files: 3
---

# T03: Asegurar demo reproducible (seed/fixture) + runbook de lanzamiento S05 (happy path + failure case)

**Slice:** S05 — Integración final “Lanzamiento” (happy path + failure visibility)
**Milestone:** M003

## Description

Convertir S05 en un flujo reproducible: asegurar que existe un seed (o fixture equivalente) que crea un tenant “demo” con usuarios y relaciones mínimas para ejecutar el happy path, y documentar el procedimiento end-to-end (incluyendo un caso de fallo/idempotencia) en un runbook que cualquier dev pueda seguir.

## Steps

1. Localizar el mecanismo actual de seed (Prisma seed) y qué datos crea hoy (tenant/users/roles/student/guardian).
2. Ajustar el seed para garantizar:
   - 1 tenant demo
   - 1 usuario Admin (y/o Director si aplica) con acceso a `/admin/finances`
   - 1 usuario Parent/Guardian asociado a un Student
   - 1 Student asociado al tenant y al guardian
3. Asegurar que el seed no introduce secretos; credenciales dev deben ser deterministas y documentadas como “solo dev”.
4. Crear `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md` con:
   - Pre-flight: migrate + seed + comando dev
   - Happy path Admin: rutas + acciones (crear concepto, generar cargos periodo, registrar pago)
   - Activity Feed: ruta exacta y qué eventos ver
   - Happy path Parent: `/parent/finances` y qué números/filas deben aparecer
   - Failure visibility: un escenario determinista (RBAC/scope o validación) y el `Código: ...` esperado
5. Incluir “Expected Observations” con criterios concretos (balance = cargos − pagos, eventos `finance.*` visibles, sin PII en metadata).
6. Ejecutar el runbook completo una vez en local y corregir el seed/runbook hasta que sea lineal.
7. Registrar en el runbook troubleshooting mínimo (qué revisar si no aparece el student, si no hay eventos, etc.).

## Must-Haves

- [ ] Seed garantiza usuarios y relaciones mínimas para demo (Admin + Parent + Student vinculados) sin pasos manuales ad hoc.
- [ ] Runbook documenta rutas exactas, credenciales dev y resultados esperados (incluye caso de fallo con `code` visible).

## Verification

- `pnpm -C app dev` + seguir `S05-RUNBOOK.md` desde un DB limpio (o reseteado) hasta completar el flujo.
- Confirmar visualmente que `/parent/finances` muestra saldo correcto y que Activity Feed muestra `finance.*`.

## Observability Impact

- Signals added/changed: Runbook se vuelve el “procedimiento operacional” de inspección para S05.
- How a future agent inspects this: Ejecutar seed + seguir `S05-RUNBOOK.md` para reproducir y aislar fallos.
- Failure state exposed: El runbook incluye checkpoints (si X no aparece, revisar Y), reduciendo ambigüedad.

## Inputs

- `app/prisma/seed.ts` (o seed actual) — datos actuales y patrones de creación.
- Superficies UI: `/admin/finances`, `/parent/finances`, Activity Feed.

## Expected Output

- `app/prisma/seed.ts` — seed actualizado para flujo reproducible.
- `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md` — runbook operacional del slice.
