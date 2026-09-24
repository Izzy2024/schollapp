# M009: Dar vida a las páginas En construcción

## Vision
Eliminar todas las páginas "En construcción" de la app, construyendo las vistas funcionales que corresponden a cada rol. Cada página debe conectarse al backend existente (actions + schema) o extenderlo cuando sea necesario. El objetivo es que ningún usuario vea un placeholder al navegar su menú completo.

## Inventario: 30 páginas En construcción

### Backend listo → Solo falta UI (19 páginas)
| # | Ruta | Rol | Backend disponible |
|---|------|-----|--------------------|
| 1 | `/admin/news` | admin | `announcements.ts` (CRUD completo) |
| 2 | `/admin/schedule` | admin | `ClassSchedule` model, `scheduleRequests.ts` |
| 3 | `/admin/analytics` | admin | `reports.ts`, `GradeRecord`, `AttendanceRecord` |
| 4 | `/admin/exams` | admin | `gradebook.ts` (`createEvaluation`), `Evaluation` model |
| 5 | `/admin/activities` | admin | `activity.ts` (`getRecentActivities`), `ActivityEvent` |
| 6 | `/admin/assignments` | admin | `Evaluation` model (type homework), `gradebook.ts` |
| 7 | `/admin/class-prep` | admin | `planning.ts` (unidades + temas CRUD) |
| 8 | `/director/financials` | director | `finance/concepts.ts`, `charges.ts`, `payments.ts` |
| 9 | `/director/academic` | director | `GradeRecord`, `AttendanceRecord`, `reports.ts` |
| 10 | `/director/staff` | director | `staff.ts`, `SectionSubject`, `GradeRecord` |
| 11 | `/teacher/news` | teacher | `announcements.ts` (lectura filtrada) |
| 12 | `/teacher/settings` | teacher | `User` model, `settings.ts` |
| 13 | `/parent/news` | parent | `announcements.ts` (lectura filtrada) |
| 14 | `/parent/settings` | parent | `User` model, `settings.ts` |
| 15 | `/student/attendance` | student | `attendance.ts` (`getStudentAttendanceSummary`) |
| 16 | `/student/schedule` | student | `ClassSchedule` model (necesita action específico) |
| 17 | `/student/exams` | student | `Evaluation` model, `gradebook.ts` |
| 18 | `/student/messages` | student | `messages.ts` (CRUD completo) |
| 19 | `/student/news` | student | `announcements.ts` (lectura filtrada) |

### Necesita modelo/action nuevo (11 páginas)
| # | Ruta | Rol | Qué falta |
|---|------|-----|-----------|
| 20 | `/student/analytics` | student | Action de agregación personal (ya hay `GradeRecord`) |
| 21 | `/student/reports` | student | Generación de boleta/report card |
| 22 | `/student/peers` | student | Query `Enrollment` por sección |
| 23 | `/student/settings` | student | `User` model, similar a teacher |
| 24 | `/student/assignments` | student | `Evaluation` type homework + submission |
| 25 | `/student/class-prep` | student | `CurricularUnit`/`Topic` (solo lectura) |
| 26 | `/student/whats-new` | student | `Announcement` + `SchoolCalendarEvent` |
| 27 | `/student/activities` | student | `SchoolCalendarEvent` filtrado |
| 28 | `/parent/documents` | parent | `Attachment` model o nuevo `Document` |
| 29 | `/director/accreditation` | director | Nuevo modelo o usar `ActivityEvent` |
| 30 | `/director/resources` | director | Nuevo modelo `Resource` |

## Slice Overview

| ID | Slice | Risk | Depends | Pages | Est |
|----|-------|------|---------|-------|-----|
| S01 | Noticias por rol (admin/teacher/parent/student) | low | — | 4 | 2h |
| S02 | Director: finanzas + rendimiento académico + staff | medium | — | 3 | 4h |
| S03 | Admin: horarios + exámenes + actividades + planeación + analytics | medium | — | 6 | 6h |
| S04 | Student: asistencia + horario + exámenes + mensajes + analytics + ajustes | medium | S01 | 8 | 6h |
| S05 | Student: tareas + compañeros + reportes + novedades + class-prep + activities | medium | S04 | 6 | 5h |
| S06 | Parent: documentos + ajustes + noticias | low | S01 | 3 | 2h |
| S07 | Director: acreditación + recursos (modelos nuevos) | high | — | 2 | 4h |
| S08 | Teacher: ajustes | low | — | 1 | 1h |
| S09 | Integración E2E + UAT final por rol | medium | S01-S08 | — | 3h |

## Orden de ejecución

1. **S01** (noticias) — el más fácil, reutiliza `announcements.ts` para todos los roles
2. **S02** (director) — prioridad alta, rol directivo necesita su dashboard completo
3. **S03** (admin features) — amplía capacidades del admin
4. **S08** (teacher settings) — rápido, 1 página
5. **S06** (parent) — pocas páginas, bajo riesgo
6. **S04** (student core) — el bulk del trabajo estudiantil
7. **S05** (student extras) — completar lo que falta del estudiante
8. **S07** (director extras) — requiere modelos nuevos, más riesgo
9. **S09** (UAT) — verificar que todo funciona E2E

## Progreso Final

| Slice | Páginas | Estado |
|-------|---------|--------|
| S01: Noticias por rol | 4 | ✅ |
| S02: Director finanzas + rendimiento + staff | 3 | ✅ |
| S03: Admin horarios + exámenes + actividades + tareas + planeación + analytics | 6 | ✅ |
| S04: Student core (asistencia, horario, exámenes, mensajes, analytics, settings) | 6 | ✅ |
| S05: Student extras (tareas, compañeros, reportes, novedades, class-prep, actividades) | 6 | ✅ |
| S06: Parent (documentos, configuración) + noticias (en S01) | 2 | ✅ |
| S07: Director extras (acreditación, recursos) | 2 | ✅ |
| S08: Teacher settings | 1 | ✅ |
| S09: UAT Final | — | ✅ PASSED |

**Total: 30/30 páginas construidas, 0 placeholders, build limpio.**

### Nuevo Backend Creado
- `src/actions/studentQueries.ts` — 7 server actions para estudiante
- `src/actions/reports.ts` — añadido `getDirectorFinancialSummary()`

## Principios de implementación

1. **Reutilizar actions existentes** — no duplicar lógica que ya funciona
2. **Consistencia visual** — usar Ant Design + Tailwind como el resto de la app
3. **Server Actions** — seguir el patrón auth → tenant → scope → mutation → revalidate
4. **No over-engineer** — vistas mínimas operativas, no completar features que nadie pidió
5. **Cada slice cierra con verificación** — navegar la página sin placeholder
