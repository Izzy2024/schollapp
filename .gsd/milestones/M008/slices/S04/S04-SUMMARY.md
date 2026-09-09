---
id: S04
milestone: M008
status: complete
tasks:
  - id: T01
    status: passed
  - id: T02
    status: passed
key_files:
  - app/scripts/s04-e2e-demo.ts
  - app/scripts/s04-uat-evidence.sql
  - .gsd/milestones/M008/slices/S04/S04-UAT.md
completed_at: 2026-04-08T21:48:00Z
---

# S04: E2E demo + UAT final (Admin→Teacher)

**Recorrido completo E2E Admin→Teacher verificado con evidencia reproducible UI+DB.**

## Resumen

Se cerró el ensamblaje del happy path completo de demo: Admin gestiona inscripción → Teacher toma asistencia, con verificación mecánica y evidencia DB reproducible. Los flujos S02 (admin inscripción) y S03 (teacher asistencia) quedan integrados en una ruta de demo operativa.

## Tareas

| Task | Título | Estado | Verificación |
|------|--------|--------|-------------|
| T01 | Script E2E Admin→Teacher con verificaciones mecánicas | ✅ passed | `result=pass` en 65ms |
| T02 | Evidencia UAT final + diagnóstico DB | ✅ passed | `final_verdict=PASS` en SQL |

## Evidencia de Cierre

1. **Runner E2E**: `node --import tsx app/scripts/s04-e2e-demo.ts` → `result=pass`
2. **Evidencia DB**: `sqlite3 app/prisma/dev.db < app/scripts/s04-uat-evidence.sql` → `final_verdict=PASS`
3. **Artefacto UAT**: `.gsd/milestones/M008/slices/S04/S04-UAT.md` existe y no vacío

## Resultado Observado

- `enrollment_status=enrolled` ✅
- `attendance_status=present` ✅
- `admin_assertion=OK` ✅
- `teacher_assertion=OK` ✅
- `final_verdict=PASS` ✅

## Troubleshooting (para futuras corridas)

- **Seed faltante**: Restaurar con `npx prisma db seed`. Síntoma: `PRECONDITION_FAILED`.
- **Prisma CLI drift**: Usar `sqlite3` directo en vez de `prisma db execute` para evidencia SQL.
- **Scope roto**: Verificar `sectionSubject.staff.userId` y ciclo activo en `school-demo`.

## Deviations

- Se usó `sqlite3` en lugar de `prisma db execute` por incompatibilidad del CLI en este entorno.

## Archivos Clave

- `app/scripts/s04-e2e-demo.ts` — Runner E2E con 4 fases y aserciones
- `app/scripts/s04-uat-evidence.sql` — Consulta SQL de evidencia
- `.gsd/milestones/M008/slices/S04/S04-UAT.md` — Documento UAT
- `.gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh` — Script de verificación
