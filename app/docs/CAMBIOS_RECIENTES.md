# Cambios Recientes (Bitácora)

## Fecha: Implementaciones de esta sesión

## 1. Correcciones críticas de arranque y rutas

- Se resolvió conflicto de rutas dinámicas duplicadas en `teacher/classes`.
- Se dejó una sola ruta activa para detalle de clase.

## 2. Flujo de solicitudes de clase estabilizado

- Se eliminó dependencia rígida de correos hardcodeados para resolver docente/revisor.
- Aprobación/rechazo ahora valida tenant y estado `pending`.
- Se previene duplicidad de solicitud para clase ya asignada al docente.

## 3. Catálogo por defecto de primaria

- Se creó `src/lib/defaultPrimaryCatalog.ts`.
- Se garantiza carga base de grados, secciones, materias y clases por tenant demo.

## 4. Nuevo módulo: Solicitudes de horario

### Backend

- Nuevo modelo Prisma: `ScheduleRequest`.
- Nueva acción: `src/actions/scheduleRequests.ts` con:
  - `createScheduleRequest`
  - `getScheduleRequests`
  - `approveScheduleRequest`
  - `rejectScheduleRequest`

### Frontend

- Detalle de clase docente ahora incluye tab `Horario` y modal de solicitud.
- Nueva página admin: `/admin/schedule-requests`.
- Nueva página director: `/director/schedule-requests`.
- Menús de admin/director actualizados para acceso directo.
- Validación de conflictos al aprobar:
  - se bloquea aprobación si el docente ya tiene otra clase en la misma franja (mismo día con solapamiento horario).
  - se devuelve mensaje explícito con la clase en conflicto.

## 5. Robustez de navegación en detalle de clase

- Manejo resiliente en `/teacher/classes/[sectionSubjectId]`:
  - reintento de carga,
  - fallback visual amigable en caso de error temporal,
  - se evitó `notFound()` agresivo en errores recuperables.

## 6. Sincronización de esquema

- Se ejecutó `npx prisma db push` y `prisma generate` con éxito.
- Verificado estado de entidad nueva y datos demo.

## 7. Observaciones pendientes

- Existen errores de lint preexistentes en el proyecto no relacionados con esta entrega.
- Recomendado: fase de limpieza de tipos (`any`) y reglas de hooks.
