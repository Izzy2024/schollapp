---
estimated_steps: 35
estimated_files: 3
skills_used: []
---

# T02: Consolidar evidencia UAT final y diagnóstico DB del ensamblaje

## Description
Tomar el runner E2E y producir evidencia final de cierre de slice: artefacto UAT legible + verificación en DB para inscripción y asistencia. Este task transforma la ejecución técnica en prueba de aceptación reproducible para milestone.

## Steps
1. Definir/actualizar consulta SQL de evidencia para validar estado final esperado tras la corrida E2E (inscripción/relación académica + asistencia).
2. Ejecutar el runner del T01 y luego las consultas DB, capturando resultados en artefactos de slice/task.
3. Redactar UAT final con pasos observables, resultado esperado vs obtenido y troubleshooting breve (drift de esquema, seed, scope).
4. Validar que los comandos de cierre de slice quedan ejecutables y listos para reutilizar en remediaciones futuras.

## Must-Haves
- Evidencia DB posterior a la corrida E2E para los dos tramos (admin y teacher).
- UAT final en markdown con pasos, resultados y diagnóstico mínimo.
- Verificación de cierre ejecutable por comando, sin depender de memoria contextual.

## Verification
- `node app/scripts/s04-e2e-demo.ts`
- `npx prisma db execute --file app/scripts/s04-uat-evidence.sql --schema app/prisma/schema.prisma`
- `test -s .gsd/milestones/M008/slices/S04/S04-UAT.md`

## Inputs
- `app/scripts/s04-e2e-demo.ts`
- `app/prisma/schema.prisma`
- `app/prisma/dev.db`
- `.gsd/milestones/M008/slices/S04/S04-PLAN.md`

## Expected Output
- `app/scripts/s04-uat-evidence.sql`
- `.gsd/milestones/M008/slices/S04/S04-UAT.md`
- `.gsd/milestones/M008/slices/S04/tasks/T02-SUMMARY.md`

## Failure Modes (Q5)
- Consulta SQL desalineada con esquema real produce falsos negativos de cierre.
- Runner E2E pasa parcialmente pero evidencia DB no refleja cambios esperados.
- UAT incompleto deja ambigüedad sobre qué validar tras cambios futuros.

## Load Profile (Q6)
- Lectura puntual de DB local post-ejecución; sin carga concurrente relevante.
- Sensible a estado previo del entorno (seed/fixtures), por lo que requiere precondiciones explícitas.

## Negative Tests (Q7)
- Verificar fallo explícito cuando SQL de evidencia no encuentra registros esperados.
- Verificar que un error en fase admin/teacher impide marcar cierre aunque exista salida parcial.
- Comprobar que ausencia de archivo UAT no permite pasar verificación de task.

## Inputs

- `app/scripts/s04-e2e-demo.ts`
- `app/prisma/schema.prisma`
- `app/prisma/dev.db`
- `.gsd/milestones/M008/slices/S04/S04-PLAN.md`

## Expected Output

- `app/scripts/s04-uat-evidence.sql`
- `.gsd/milestones/M008/slices/S04/S04-UAT.md`
- `.gsd/milestones/M008/slices/S04/tasks/T02-SUMMARY.md`

## Verification

node app/scripts/s04-e2e-demo.ts && npx prisma db execute --file app/scripts/s04-uat-evidence.sql --schema app/prisma/schema.prisma && test -s .gsd/milestones/M008/slices/S04/S04-UAT.md

## Observability Impact

Consolida superficie de inspección post-demo en SQL reproducible y UAT con señales de falla por etapa.
