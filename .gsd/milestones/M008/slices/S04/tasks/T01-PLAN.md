---
estimated_steps: 36
estimated_files: 3
skills_used: []
---

# T01: Orquestar script de demo E2E Admin→Teacher con verificaciones mecánicas

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

## Verification

bash .gsd/milestones/M008/slices/S04/tasks/verify-t01-e2e.sh

## Observability Impact

Añade logs por fase y códigos de salida deterministas para localizar fallo exacto del recorrido E2E.
