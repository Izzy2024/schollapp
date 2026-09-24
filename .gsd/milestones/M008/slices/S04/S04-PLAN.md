# S04: E2E demo + UAT final (Admin→Teacher)

**Goal:** Cerrar el recorrido demo end-to-end Admin→Teacher (inscripción y asistencia) sobre rutas reales, con evidencia reproducible UI+DB y sin páginas clave en placeholder en el flujo grabable.
**Demo:** Recorrido completo grabable: login admin → inscripción → login teacher → asistencia, sin placeholders.

## Must-Haves

- Demo ejecutable: login admin → operación mínima de inscripción/reinscripción → login teacher → acceso a clase → registro de asistencia para una fecha.
- El recorrido no cae en páginas 'En construcción' ni errores genéricos dentro del happy path.
- Existe evidencia reproducible de verificación E2E (script/comando + salida) y evidencia DB de los cambios esperados en inscripción/asistencia.
- Quedan documentados diagnósticos para fallos típicos (drift de esquema, datos seed ausentes, scope de usuario).

## Proof Level

- This slice proves: final-assembly

## Integration Closure

Integra de forma explícita los flujos ya habilitados por S02 (admin inscripción) y S03 (teacher asistencia) en una sola ruta de demo operativa con verificación cruzada UI+DB.

## Verification

- Se consolida una superficie única de diagnóstico para demo E2E: comandos de smoke/browser y consultas SQL reproducibles para verificar estado final y localizar fallos por etapa.

## Tasks

- [x] **T01: Orquestar script de demo E2E Admin→Teacher con verificaciones mecánicas** `est:90m`
  ## Description
Construir un runner reproducible del happy path completo para que cualquier ejecutor valide la demo sin interpretación manual. Este task existe para cerrar el riesgo principal de S04: tener piezas funcionales aisladas (S02/S03) pero sin prueba de ensamblaje real.

## Steps
1. Revisar y reutilizar superficies existentes del flujo admin inscripción y teacher clases/asistencia en rutas reales, evitando dependencias a placeholders.
2. Crear un script de verificación E2E (bash/node) que ejecute la secuencia de demo en orden (precondiciones, tramo admin, tramo teacher) y falle con códigos/errores claros por etapa.
3. Incluir en el script checks explícitos de navegación/estado para detectar regresiones de placeholders/errores genéricos en el recorrido crítico.
4. Exponer salida diagnóstica mínima por fase (admin, teacher, persistencia) para reducir tiempo de triage en futuras corridas.

## Must-Haves
- Runner ejecutable en un solo comando desde `app/` o raíz del repo.
- Validaciones mecánicas del flujo Admin→Teacher (no solo checklist manual).
- Mensajes de error por etapa (precondición/admin/teacher) y salida no-cero ante fallo.
- Referenciar rutas reales del producto en vez de mocks ad-hoc.

## Verification
- `bash .gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh`
- `test -f app/scripts/s04-e2e-demo.ts`

## Inputs
- `.gsd/milestones/M008/slices/S03/S03-SUMMARY.md`
- `app/src/app/teacher/classes/page.tsx`
- `app/src/app/teacher/classes/[sectionSubjectId]/page.tsx`
- `app/src/actions/teacher.ts`
- `app/src/app/admin`

## Expected Output
- `app/scripts/s04-e2e-demo.ts`
- `.gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh`
- `.gsd/milestones/M008/slices/S04/tasks/T01-SUMMARY.md`

## Failure Modes (Q5)
- Seed/data drift deja usuarios/relaciones faltantes y rompe el tramo admin o teacher.
- Cambio de rutas/labels de UI rompe selectores o aserciones del runner.
- Flujo aparenta pasar en UI pero no confirma estados intermedios críticos.

## Load Profile (Q6)
- Carga baja y secuencial (demo única), pero con múltiples transiciones de sesión/rol en una misma corrida.
- Debe mantenerse estable en ejecución local repetida (idempotencia razonable de precondiciones).

## Negative Tests (Q7)
- Fallar intencionalmente si una ruta esperada responde placeholder/'En construcción'.
- Fallar si no existen datos mínimos de demo (usuario/relación de clase) con mensaje accionable.
- Fallar si una etapa no completa y bloquear continuidad a la siguiente fase.
  - Files: `app/scripts/s04-e2e-demo.ts`, `.gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh`, `.gsd/milestones/M008/slices/S04/tasks/T01-SUMMARY.md`
  - Verify: bash .gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh

- [x] **T02: Consolidar evidencia UAT final y diagnóstico DB del ensamblaje** `est:70m`
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
  - Files: `app/scripts/s04-uat-evidence.sql`, `.gsd/milestones/M008/slices/S04/S04-UAT.md`, `.gsd/milestones/M008/slices/S04/tasks/T02-SUMMARY.md`
  - Verify: node app/scripts/s04-e2e-demo.ts && npx prisma db execute --file app/scripts/s04-uat-evidence.sql --schema app/prisma/schema.prisma && test -s .gsd/milestones/M008/slices/S04/S04-UAT.md

## Files Likely Touched

- app/scripts/s04-e2e-demo.ts
- .gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh
- .gsd/milestones/M008/slices/S04/tasks/T01-SUMMARY.md
- app/scripts/s04-uat-evidence.sql
- .gsd/milestones/M008/slices/S04/S04-UAT.md
- .gsd/milestones/M008/slices/S04/tasks/T02-SUMMARY.md
