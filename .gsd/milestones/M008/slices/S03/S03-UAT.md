# S03: Teacher: Asistencia mínima (tomar asistencia + persistencia) — UAT

**Milestone:** M008
**Written:** 2026-04-08T19:43:40.548Z

# S03: Teacher: Asistencia mínima (tomar asistencia + persistencia) — UAT

**Milestone:** M008  
**Written:** 2026-04-08

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: La slice combina comportamiento de UI (ruta/listado/navegación teacher) y validación de persistencia (DB), por lo que requiere prueba visual + evidencia de datos.

## Preconditions

- App disponible en entorno local con base sqlite configurada.
- Seed ejecutado: `cd app && npm run db:seed`.
- Usuario teacher válido en datos seed.
- Existe al menos una clase/sectionSubject asignada al teacher.

## Smoke Test

Login como teacher → abrir `/teacher/classes` → abrir una clase desde card → confirmar que carga detalle con tabs (incluyendo Asistencia) sin error genérico.

## Test Cases

### 1. Listado de clases teacher y navegación a detalle

1. Iniciar sesión con credenciales de teacher.
2. Navegar a `/teacher/classes`.
3. Verificar que aparece el encabezado “Mis Clases” y al menos una card de clase.
4. Hacer click en una card.
5. **Expected:** navega a `/teacher/classes/[sectionSubjectId]`, renderiza detalle de clase y no muestra 404 ni “Algo salió mal”.

### 2. Persistencia de asistencia en DB (evidencia técnica)

1. Ejecutar: `cd app && npm run db:seed`.
2. Ejecutar verificación de esquema:  
   - `cd app && sqlite3 prisma/dev.db ".schema AttendanceSession"`  
   - `cd app && sqlite3 prisma/dev.db ".schema AttendanceRecord"`
3. Ejecutar SQL de evidencia: `cd app && npx prisma db execute --schema prisma/schema.prisma --file scripts/t03-uat-evidence.sql`.
4. **Expected:** se confirma existencia de tablas/relaciones de asistencia y, si falla SQL por columnas asumidas, el fallo queda explicado por drift conocido (`takenById` vs `takenBy/source`) para ajuste del script, no por ausencia de feature.

## Edge Cases

### Teacher sin clases asignadas

1. Iniciar sesión con un teacher sin sectionSubjects asignadas (o simular condición).
2. Abrir `/teacher/classes`.
3. **Expected:** la vista no rompe; muestra estado vacío manejado y evita error genérico.

### Drift de esquema en scripts de evidencia

1. Ejecutar SQL diseñado con columnas no presentes en esquema local.
2. Verificar esquema real con `.schema`.
3. **Expected:** se identifica causa exacta por incompatibilidad de columnas y se mantiene trazabilidad para corrección controlada del script.

## Failure Signals

- `/teacher/classes` responde 404 o redirige a placeholder.
- Al abrir clase aparece error genérico sin mensaje accionable.
- No existe estructura `AttendanceSession`/`AttendanceRecord` en DB.
- SQL/evidencia falla sin diagnóstico ni explicación de esquema.

## Not Proven By This UAT

- No prueba exhaustiva de todos los estados de asistencia por alumno desde UI en esta corrida.
- No cubre concurrencia/múltiples teachers ni escenarios de alta carga.
- No valida reportes derivados de asistencia, sólo captura/persistencia base y diagnóstico.

## Notes for Tester

- Existe drift conocido de esquema local (`takenById` en lugar de `takenBy/source`) que afecta SQL heredados; usar el esquema real como fuente de verdad antes de ajustar consultas.
- Si la UI de asistencia cambia de tabs/componentes, conservar este UAT como contrato mínimo del flujo teacher clases→detalle→persistencia.
