# S04 UAT — E2E Admin→Teacher (Inscripción + Asistencia)

## Objetivo
Validar el recorrido completo de demo sobre rutas reales: **login admin → inscripción** y **login teacher → asistencia**, con evidencia reproducible en DB.

## Precondiciones
- Base local disponible en `app/prisma/dev.db`.
- Datos seed mínimos existentes (`tenant: school-demo`, `admin@demo.com`, `docente1@demo.com`, ciclo activo, relación docente-sección).

## Comandos de cierre reproducibles
1. Runner E2E del ensamblaje:
   - `node app/scripts/s04-e2e-demo.ts`
2. Evidencia DB del estado final (compatible con el entorno actual):
   - `sqlite3 app/prisma/dev.db < app/scripts/s04-uat-evidence.sql`
3. Verificación de presencia del artefacto UAT:
   - `test -s .gsd/milestones/M008/slices/S04/S04-UAT.md`

## Resultado observado (corrida actual)
### 1) Runner E2E
- Resultado: **PASS** (`result=pass`).
- Señales por fase:
  - `phase=preconditions status=ok`
  - `phase=admin status=ok`
  - `phase=teacher status=ok`
  - `phase=persistence status=ok`

### 2) Evidencia DB
Consulta ejecutada desde `app/scripts/s04-uat-evidence.sql`.

Resultado clave observado:
- `enrollment_status = enrolled` (tramo admin)
- `attendance_status = present` (tramo teacher)
- `admin_assertion = OK`
- `teacher_assertion = OK`
- `final_verdict = PASS`

Esto confirma que el ensamblaje E2E deja persistencia coherente en ambos tramos del flujo.

## Esperado vs obtenido
- Esperado: inscripción activa + asistencia presente para el alumno demo de la corrida.
- Obtenido: **coincide** (`final_verdict=PASS`).

## Troubleshooting breve
- **Drift de Prisma CLI**: en este entorno `prisma db execute` no acepta `--schema` y además exige config con `datasource.url` para ejecutar sin schema explícito.
  - Síntoma: `unknown or unexpected option: --schema` o `datasource.url property is required`.
  - Acción: usar `sqlite3 app/prisma/dev.db < app/scripts/s04-uat-evidence.sql` para evidencia DB reproducible.
- **Seed faltante o incompleto**:
  - Síntoma: `PRECONDITION_FAILED` en runner.
  - Acción: restaurar datos seed mínimos para tenant, usuarios y asignaciones.
- **Scope de usuario/relación académica rota**:
  - Síntoma: falla en fase admin o teacher con salida no-cero.
  - Acción: validar asignación `sectionSubject.staff.userId` y ciclo activo en tenant `school-demo`.

## Criterio de aceptación de cierre S04
Se considera cierre válido cuando en una misma corrida:
1. El runner reporta `result=pass`.
2. La evidencia SQL reporta `final_verdict=PASS`.
3. El artefacto UAT existe y es no vacío.
