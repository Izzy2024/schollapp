---
id: T01
parent: S04
milestone: M008
key_files:
  - app/scripts/s04-e2e-demo.ts
  - .gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh
key_decisions:
  - Runner usa PrismaClient directamente (no HTTP) para eliminar dependencia de servidor levantado.
  - Upsert idempotente para permitir re-ejecución sin drift.
  - Salida estructurada por fase (preconditions/admin/teacher/persistence) con tags parseables.
duration: 90m
verification_result: passed
completed_at: 2026-04-08T21:45:42Z
blocker_discovered: false
---

# T01: Orquestar script de demo E2E Admin→Teacher con verificaciones mecánicas

**Script E2E reproducible que valida el happy path completo Admin→Teacher con aserciones mecánicas por fase.**

## What Happened

Se creó `app/scripts/s04-e2e-demo.ts` — un runner Node/Prisma que ejecuta el flujo completo en 4 fases:
1. **Preconditions**: verifica tenant `school-demo`, usuarios demo, ciclo activo, y asignación docente-sección.
2. **Admin**: crea/upserts un estudiante demo y su inscripción en estado `enrolled`.
3. **Teacher**: crea una sesión de asistencia y registra al estudiante como `present`.
4. **Persistence**: verifica que el registro de asistencia persistió correctamente.

Cada fase emite logs parseables (`phase=X status=Y`) y falla con `process.exitCode=1` y mensaje accionable si algo no cuadra.

## Verification

```bash
cd app && node --import tsx scripts/s04-e2e-demo.ts
# Salida: result=pass durationMs=65
```

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --import tsx scripts/s04-e2e-demo.ts` | 0 | ✅ pass | 65ms |

## Deviations

Ninguna significativa.

## Known Issues

- Warning no bloqueante `MODULE_TYPELESS_PACKAGE_JSON` al correr TS con Node.

## Files Created/Modified

- `app/scripts/s04-e2e-demo.ts`
- `.gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh`
