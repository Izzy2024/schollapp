# M002 / S03 — Research

**Date:** 2026-03-18

## Summary

S03 (Control de Asistencia) soporta principalmente **R005 (Control de Asistencia Diaria y Reportes)** y alimenta **R006 (Bitácora y Trazabilidad)** para S05. El código base ya tiene la mayor parte del flujo implementado en backend y UI para admin (`/admin/attendance`) y para docente mediante drawer (`AttendanceDrawer` + `getAttendanceSession/saveAttendanceSession`). El modelo Prisma también ya incluye `AttendanceSession` y `AttendanceRecord` con índices y claves únicas correctas para deduplicar por fecha/grupo/alumno.

El mayor riesgo no es “falta de feature”, sino **consistencia de negocio y autorización**: actualmente las acciones de asistencia validan autenticación y tenant, pero no verifican explícitamente permisos por rol ni, en el flujo docente, que el usuario esté asignado al `sectionSubjectId`. También hay deuda de trazabilidad: se crea `ActivityEvent`, pero no se registra `actorUserId`, y `takenById` de `AttendanceSession` existe en schema pero no se persiste en saves.

La recomendación para ejecución de S03 es un cierre de slice orientado a robustez: endurecer guards multi-tenant/rol, completar metadatos de trazabilidad (`takenById`, `actorUserId`), normalizar estados de asistencia con validación estricta y cerrar verificación end-to-end (admin y docente) con cobertura mínima de reporte básico por grupo/alumno.

## Recommendation

Tomar enfoque de **hardening + verificación funcional** en vez de rediseño:

1. **Consolidar autorización por rol y alcance** en `app/src/actions/attendance.ts` (admin/control escolar y docente asignado).
2. **Persistir actor de auditoría** en cada guardado (`AttendanceSession.takenById` + `ActivityEvent.actorUserId`).
3. **Validar estados permitidos** (`present|absent|late|excused`) antes de upsert para evitar valores basura.
4. **Alinear reportes básicos** usando `getStudentAttendanceSummary` y (si falta) agregar agregado por grupo/fecha para cubrir criterio de director.
5. **Completar verificación reproducible**: guardar, recargar, confirmar idempotencia por fecha/sección y consistencia de conteos.

Esto minimiza riesgo porque reutiliza estructuras existentes y ataca los huecos que pueden romper S05 (bitácora/dashboard) más adelante.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Deduplicar sesiones por grupo+fecha | `AttendanceSession @@unique([tenantId, sectionId, date])` + `upsert` | Evita duplicados y simplifica edición/reintento del pase de lista. |
| Persistencia idempotente por alumno | `AttendanceRecord @@unique([tenantId, attendanceSessionId, studentId])` + `upsert` | Permite guardar múltiples veces sin crear filas repetidas. |
| Rehidratación de lista con defaults | `getAttendanceBySectionDate` / `getAttendanceSession` ya regresan data y UI defaultea a `present` | Evita inventar otra capa de inicialización. |
| Invalidación de UI | `revalidatePath('/admin/attendance')` y `revalidatePath(/teacher/classes/...)` | Patrón ya usado; mantiene consistencia de render server/client. |

## Existing Code and Patterns

- `app/src/actions/attendance.ts` — núcleo de S03: lectura y guardado para admin y docente, summary por alumno, y emisión de `ActivityEvent`.
- `app/src/app/admin/attendance/page.tsx` — UI principal de control escolar: selector de sección/fecha, estado por alumno, guardado e indicadores de resumen.
- `app/src/components/AttendanceDrawer.tsx` — flujo docente por `sectionSubjectId`; patrón de modal lateral reutilizable, pero con posible deuda de autorización fina.
- `app/prisma/schema.prisma` — modelado de asistencia ya establecido (`AttendanceSession`, `AttendanceRecord`) y preparado para trazabilidad (`takenById`, `actorUserId` en bitácora).

## Constraints

- Slice depende de S02: asistencia opera sobre alumnos con `Enrollment.status='enrolled'`; sin inscripción activa no hay población de lista.
- `tenantSlug` se deriva de sesión (`authSession.user.tenantSlug`) dentro de actions; cualquier acceso cruzado debe bloquearse explícitamente en consultas por IDs externos.
- El esquema admite `takenById`, pero la implementación actual no lo utiliza al guardar (brecha entre modelo y runtime).
- `status` en `AttendanceRecord` es `String` libre en DB; la validez depende de validación de aplicación (hoy parcial/implícita).

## Common Pitfalls

- **Confundir sección académica con clase/materia** — Admin guarda por `sectionId`; docente por `sectionSubjectId` resolviendo a `sectionId`. Si no se valida ese mapeo, pueden aparecer inconsistencias de permisos.
- **Asumir que autenticación equivale a autorización** — Hoy hay check de user autenticado, pero no de rol/ownership para todos los paths de asistencia.
- **Pérdida de trazabilidad de actor** — `ActivityEvent` se crea sin `actorUserId`; limita utilidad de S05 para auditoría real.
- **Estado inválido silencioso** — Al no validar enumeración, cualquier string podría persistirse y romper reportes/porcentajes.

## Open Risks

- Riesgo de acceso indebido: un usuario autenticado podría intentar operar asistencia fuera de su alcance si conoce IDs.
- Riesgo de calidad de datos: estados no normalizados dañan métricas en reportes y dashboard futuro.
- Riesgo de observabilidad: sin `actorUserId`/`takenById`, la bitácora no responde “quién tomó lista”.
- Riesgo de continuidad: el resumen S02 es placeholder; validar en ejecución que supuestos de inscripciones activas sean correctos por tenant/ciclo.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Prisma / modelado multi-tenant | `context7` | available (installed) |
| Next.js App Router + Server Actions | `context7` | available (installed) |
| UI frontend (asistencia admin) | `frontend-design` | available (installed) |
| Debugging de casos límite de autorización/datos | `debug-like-expert` | available (installed) |
| Ant Design (message API) | none found (no búsqueda externa ejecutada; no bloqueante) | none found |

## Sources

- Estructura de investigación y formato de artifacto (source: `~/.gsd/agent/extensions/gsd/templates/research.md`)
- Alcance de slice y dependencias S02→S03→S05 (source: `.gsd/milestones/M002/M002-ROADMAP.md`, preloaded)
- Requisito activo soportado por la slice (source: `.gsd/REQUIREMENTS.md`, preloaded)
- Implementación actual de acciones de asistencia, summary por alumno y eventos (source: `app/src/actions/attendance.ts`)
- Flujo UI admin de pase de lista y agregados visuales (source: `app/src/app/admin/attendance/page.tsx`)
- Flujo docente actual en drawer (source: `app/src/components/AttendanceDrawer.tsx`)
- Restricciones de schema y claves únicas de asistencia/bitácora (source: `app/prisma/schema.prisma`)
