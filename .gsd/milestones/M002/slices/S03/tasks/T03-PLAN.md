---
estimated_steps: 4
estimated_files: 4
---

# T03: Alinear UI y cerrar verificación operativa admin/docente con reportes básicos

**Slice:** S03 — Control de Asistencia
**Milestone:** M002

## Description

Cerrar la slice en superficie de producto: integrar respuestas endurecidas en UI de admin y docente, verificar persistencia/recarga con conteos correctos y consolidar reporte básico por alumno/grupo en flujo real.

## Steps

1. Ajustar `/admin/attendance` para manejar de forma determinística errores de autorización/estado inválido y mantener feedback claro de guardado.
2. Ajustar `AttendanceDrawer` docente para reflejar restricciones de asignación y estados de guardado/reintento.
3. Verificar wiring de reportes básicos (acciones/helper existente) para que conteos por alumno/grupo sean consistentes tras recarga.
4. Ejecutar suite de pruebas + smoke runtime del flujo admin/docente y documentar cierre operativo de demo.

## Must-Haves

- [ ] La UI expone resultado de guardado/falla sin ambigüedad y sin ocultar errores de política.
- [ ] El flujo admin y docente asignado demuestra guardado idempotente y recarga consistente por fecha/sección.
- [ ] El reporte básico por alumno/grupo refleja los estados persistidos válidos.

## Verification

- `npm test -- app/src/actions/__tests__/attendance.authorization.test.ts app/src/actions/__tests__/attendance.persistence.test.ts app/src/actions/__tests__/attendance.reporting.test.ts`
- Smoke runtime: ejecutar flujo real en `/admin/attendance` y drawer docente, guardar, recargar y confirmar conteos/estado en UI.

## Observability Impact

- Signals added/changed: mejor propagación de errores estables a UI (mensaje/estado).
- How a future agent inspects this: reproducir smoke en UI + consultar `ActivityEvent` y tablas de asistencia para correlación.
- Failure state exposed: diferencias entre error de política vs error de validación visibles en UI y trazables en backend.

## Inputs

- `app/src/actions/attendance.ts` endurecido en T02.
- `app/src/app/admin/attendance/page.tsx` y `app/src/components/AttendanceDrawer.tsx` actuales.

## Expected Output

- `app/src/app/admin/attendance/page.tsx` — UI admin alineada con respuestas endurecidas.
- `app/src/components/AttendanceDrawer.tsx` — flujo docente robusto ante restricciones/errores.
- `app/src/actions/__tests__/attendance.reporting.test.ts` — aserciones finales del reporte básico operando con wiring real.
