# Análisis de brechas — APPSSCHOLL vs. SIS/ERP escolar completo

Auditoría del estado actual del proyecto (2026-07) frente a lo que necesita un sistema de gestión escolar completo. Sirve como referencia para priorizar el backlog no planificado tras cerrar los 9 milestones de GSD.

## 1. Inventario por madurez

### Maduros (con profundidad real)

| Módulo | Evidencia |
|---|---|
| Finanzas | `src/actions/finance/` (13 archivos): conceptos, cargos, pagos, facturas, planes de pago con cuotas, descuentos/becas, morosidad + dunning, estados de cuenta, factura PDF, facturación electrónica Panamá (RUC/DV/NIT/PAC) |
| Asistencia | `attendance.ts`: sesiones y registros por clase y por sección-fecha, resumen por estudiante |
| Mensajería interna | `messages.ts`: conversaciones 1:1/grupo, UI en los 4 roles |
| Catálogo académico | años, secciones, grados, materias, `SectionSubject` |
| Solicitudes de horario/clase | `scheduleRequests.ts`, `classRequests.ts`: workflow completo con validación de colisiones docente |
| Calendario escolar | `calendar.ts` + `SchoolCalendarEvent`, CRUD y vistas por rol |
| Audit trail | `ActivityEvent` vía `activity.ts`/`activity-emit.ts`, feeds admin/director |
| Registro por código de invitación | `invitations.ts` + `/register`: admin genera código ligado a Staff/Student/Guardian, la persona crea su cuenta; `mustChangePassword` fuerza cambio en el primer login con contraseña temporal |
| Boletas de calificaciones | `reportCards.tsx`: ponderación configurable por tipo de evaluación (`admin/settings/grade-weights`), promedio por período y por materia, export PDF (`/api/report-cards/[studentId]/[termId]/pdf`), vistas en admin (tab del expediente), alumno y padre |
| Portal del padre: notas y asistencia | `/parent/report-card` (boleta) y `/parent/attendance` (asistencia por hijo); `getChildAttendanceSummary` en `parent.ts` verifica el vínculo `StudentGuardian` antes de exponer datos |
| Entrega de tareas | `submissions.ts` + modelo `Submission`: el docente marca una evaluación con `dueDate` para que acepte entregas; el alumno sube un archivo (vía `storage adapter`) en `/student/assignments`, se marca `late` si es tras la fecha límite; el docente ve las entregas y deja retroalimentación en `/teacher/assignments` |
| Conducta/disciplina | `conduct.ts` + modelo `ConductRecord`: méritos/deméritos/incidentes con puntos; docente solo para sus propias clases, admin/director para cualquier alumno, alumno/padre en modo lectura con puntaje acumulado |
| Biblioteca | `library.ts` + modelos `Book`/`BookLoan`: catálogo con disponibilidad, préstamo/devolución con control de copias, historial por alumno |
| Transporte escolar | `transport.ts` + modelos `TransportRoute`/`TransportStop`/`TransportAssignment`: rutas con capacidad, paradas con horario, asignación por alumno visible para el propio alumno/padre |
| Cafetería/comedor | `cafeteria.ts` + modelos `CafeteriaMenuItem`/`CafeteriaAccount`/`CafeteriaTransaction`: saldo prepago por alumno, recarga y cobro con validación de saldo suficiente |

### A medias

| Módulo | Qué falta |
|---|---|
| Gradebook | El cálculo de promedios simples del propio gradebook del docente (`gradebook.ts`) sigue sin normalizar por `maxScore` ni ponderar — la ponderación real vive en `reportCards.tsx` (boleta), no se retroalimentó al gradebook para no arriesgar su UI/tests existentes |
| Rol parent | Ya ve boleta de notas (`/parent/report-card`) y asistencia detallada (`/parent/attendance`); `parent/documents` sigue usando un scope de attachments hardcodeado (`'tenant','general'`) |
| Attachments | Abstracción lista (`src/lib/storage/`), pero sin `BLOB_READ_WRITE_TOKEN` sigue usando filesystem local en producción — falta provisionar el store |
| RBAC granular | `hasPermission()` (`src/lib/rbac.ts`) ya consulta permisos reales y hay permisos granulares sembrados, pero ningún action file lo usa todavía — todos siguen autorizando por string de rol |
| Páginas M009 recicladas | `director/resources` (deriva de `ClassSchedule.room`, sin modelo `Room`), `director/accreditation` (es el feed de `ActivityEvent` renombrado), `student/analytics`/`student/reports` (mismo `getStudentGrades()`, distinto render) |

### Inexistentes

Notificaciones externas más allá de invitaciones (SMS/push, anuncios/cobranza por email), admisiones (pipeline de aspirantes), conducta/disciplina, promoción/rollover de año académico, certificados y constancias oficiales, rúbricas y evaluación por competencias, reservas de aulas/recursos, biblioteca, transporte, cafetería, enfermería, RRHH/nómina de personal, inventario/activos, pasarela de pago online, integraciones externas (Google Classroom, SIS estatal), portal público del colegio, recuperación de contraseña por email.

## 2. Brechas priorizadas

### P0 — bloqueantes para uso real

1. ~~**Registro por código de invitación**~~ — **Hecho.** `invitations.ts` + `/register`; admin genera código por persona (Staff/Student/Guardian), `mustChangePassword` fuerza cambio en el primer login con contraseña temporal.
2. ~~**Backdoor de login demo**~~ — **Hecho.** Gateado tras `ALLOW_DEMO_LOGIN=1` (solo `.env` de desarrollo); también se eliminó el fallback de roles por substring de email.
3. ~~**Boletas de calificaciones**~~ — **Hecho.** `reportCards.tsx`: ponderación configurable por tipo de evaluación, promedio por período, vistas admin/alumno/padre y export PDF.
4. ~~**Portal del padre real**~~ — **Hecho.** `/parent/report-card` (boleta) y `/parent/attendance` (asistencia por hijo), ambos con verificación de vínculo `StudentGuardian`.
5. **Migración SQLite → Postgres** — 9 modelos financieros con escritura concurrente multi-tenant no son seguros en SQLite en producción. Runbook listo en `docs/POSTGRES_MIGRATION.md`: el schema ya es portable (sin tipos nativos SQLite), solo falta provisionar la base y ejecutar los pasos (cambiar provider, regenerar migraciones, y sumar `mode: 'insensitive'` a las búsquedas `contains:` que hoy dependen del comportamiento case-insensitive de SQLite).
6. ~~**Attachments a object storage**~~ — **Preparado.** `src/lib/storage/` define `StorageAdapter` con adapter local (filesystem, default) y adapter Vercel Blob; `getStorageAdapter()` cambia automáticamente a Blob si existe `BLOB_READ_WRITE_TOKEN` en el entorno — solo falta provisionar el Blob store en Vercel y setear la variable.
7. ~~**Notificaciones por email**~~ — **Preparado.** `src/lib/email/` define `EmailAdapter` con adapter de consola (default, solo loguea) y adapter Resend; `sendEmail()` cambia a Resend si existe `RESEND_API_KEY`. Ya integrado en `createInvitation` (envía el link de registro al email del Staff/Student/Guardian invitado, si tiene uno). Falta extenderlo a anuncios/recordatorios de cobranza y provisionar la cuenta de Resend.

### P1 — para un SIS completo

- ~~Entrega de tareas~~ — **Hecho.** `Evaluation.dueDate` opcional + modelo `Submission`; el docente pone fecha límite al crear la evaluación, el alumno sube un archivo en `/student/assignments` (marcado `late` si entrega tarde), el docente ve las entregas y deja retroalimentación en `/teacher/assignments`.
- ~~Admisiones~~ — **Hecho.** Modelo `Applicant` + `admissions.ts`: formulario público sin login en `/apply/[tenantSlug]`, pipeline en `/admin/admissions` (examen → decisión → conversión a `Student`, con `Guardian` vinculado si se registró). La conversión crea el alumno pero no lo inscribe a una sección — eso sigue el flujo existente de `/admin/enrollment` a propósito, para no duplicar su lógica de capacidad/validación.
- ~~Promoción/rollover de año académico~~ — **Hecho.** `promotion.ts` (`/admin/academic/promotion`): vista previa por sección + ejecución que promueve a todos los alumnos activos al siguiente `GradeLevel` (creando la sección equivalente en el año destino si no existe), marca `graduated` a los del grado más alto, y activa el año destino. Reutiliza el status `reenrolled` que ya usaba el resto del código sin que nada lo escribiera hasta ahora.
- ~~Certificados y constancias oficiales~~ — **Hecho (constancia de estudios).** `certificates.tsx` genera un PDF de constancia de inscripción/estudios por alumno + año académico (`/api/certificates/enrollment/[studentId]/[academicYearId]/pdf`), botón "Constancia" en cada fila del historial de inscripciones del expediente del alumno. No cubre otros documentos oficiales (constancia de conducta, certificado de notas final, etc.) — se puede extender con el mismo patrón (template react-pdf + action) cuando se necesiten.
- ~~Recuperación de contraseña por email~~ — **Hecho.** `passwordReset.ts` + modelo `PasswordResetToken` (expira en 1h, uso único); `/forgot-password` no revela si el email existe (previene enumeración de cuentas); `/reset-password?token=X` para establecer la nueva contraseña.
- ~~RBAC granular real~~ — **Infraestructura lista, adopción parcial.** `src/lib/rbac.ts` (`hasPermission()`) consulta `Role → RolePermission → Permission` de verdad, con permisos granulares sembrados (`finance:write`, `students:manage`, `staff:manage`, `invitations:manage`, `grades:write`, `attendance:write`) además de los `app:*` legacy. **No se migraron** los ~40 archivos de `src/actions/**` que hoy autorizan por string de rol (`roles.includes('admin')`) — cada uno requeriría además actualizar sus contract tests (que crean sesiones de prueba con `roles: string[]` y tenants efímeros sin `Role`/`RolePermission` sembrados) para exercitar el chequeo real contra la DB. Migrar módulo por módulo es trabajo futuro incremental.

### P2 — ERP ampliado

- ~~Conducta/disciplina~~ — **Hecho.** Modelo `ConductRecord` (mérito/demérito/incidente, con puntos y categoría) + `conduct.ts`: el docente registra conducta solo para alumnos de sus propias clases (`/teacher/conduct`), admin/director para cualquier alumno (tab "Conducta" en el expediente), alumno y padre ven su propio historial y puntaje acumulado (`/student/conduct`, `/parent/conduct`).
- ~~Biblioteca~~ — **Hecho.** Modelos `Book`/`BookLoan` + `library.ts`: catálogo con copias disponibles, préstamo/devolución (admin/director en `/admin/library`, con control de disponibilidad y bloqueo de borrado si el libro tiene préstamos activos), alumno ve sus propios préstamos activos e historial en `/student/library`.
- ~~Transporte escolar~~ — **Hecho.** Modelos `TransportRoute`/`TransportStop`/`TransportAssignment` + `transport.ts`: rutas con conductor/placa/capacidad, paradas con horario de recogida/entrega, asignación de alumnos (respeta la capacidad de la ruta, bloquea borrado de ruta con alumnos asignados). Admin gestiona en `/admin/transport`; alumno y padre ven su propia ruta/parada/horario en `/student/transport` y `/parent/transport`.
- ~~Cafetería/comedor~~ — **Hecho.** Modelos `CafeteriaMenuItem`/`CafeteriaAccount`/`CafeteriaTransaction` + `cafeteria.ts`: menú de productos, cuenta prepago por alumno, recarga y cobro de consumo (rechaza el cobro si el saldo no alcanza) gestionados por admin/director en `/admin/cafeteria`; alumno y padre ven su saldo e historial en modo lectura.
- Enfermería/salud, RRHH/nómina de personal, inventario de activos, pasarela de pago online, integraciones (Google Classroom, SIS estatal).

## 3. Checklist técnico por componente

### Autenticación

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| NextAuth v5 credentials + bcryptjs, sesión JWT con `roles[]`/`tenantId`/`tenantSlug`; registro por código de invitación (`invitations.ts`, `/register`); `mustChangePassword` obligatorio tras provisioning; recuperación de contraseña por email (`passwordReset.ts`, `/forgot-password`, `/reset-password`) | — | — |
| RBAC por prefijo de ruta en `auth.config.ts`/`auth-guards.mjs` | Solo cubre `/admin`, `/teacher`, `/director` — `/student` y `/parent` sin gate de rol | Añadir estos prefijos al RBAC de rutas |
| — | `AUTH_SECRET` con fallback hardcodeado (`'secret-for-dev-only-change-in-prod'`) | Obligatorio en producción, sin fallback silencioso |

### Base de datos

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| SQLite (`dev.db`), Prisma `db push` sin migraciones | Sin concurrencia real, sin backups gestionados, sin migraciones versionadas | Postgres gestionado (Railway, Supabase o Neon) + `prisma migrate` para producción — ver runbook en `docs/POSTGRES_MIGRATION.md` |

### Usuarios y tenancy

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| `Staff.userId` FK real; `Tenant` particiona todo con cascade delete | `Student`/`Guardian` se resuelven por coincidencia de string de email (frágil); sesión toma solo `memberships[0]`, multi-tenant por usuario es de facto single-tenant | Corto plazo: mantener email como clave de matching (ya funciona); si un usuario necesita pertenecer a 2+ tenants, añadir selector de escuela en login |

### Despliegue

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| Next.js build estándar; adapters listos para Vercel Blob (`src/lib/storage/`) y Resend (`src/lib/email/`) | Sin CI/CD documentado, sin `BLOB_READ_WRITE_TOKEN` ni `RESEND_API_KEY` provisionados | Vercel + Postgres gestionado + Vercel Blob (activar con el token) + Resend (activar con la API key + `RESEND_FROM_EMAIL`) |

### Seguridad de datos de menores

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| Multi-tenant con aislamiento por `tenantId` | Sin política de retención de datos, sin cifrado a nivel de campo para datos sensibles, sin log de accesos a expedientes de menores | Definir retención (ej. borrar/anonimizar N años tras egreso), restringir acceso a expedientes por rol+necesidad, considerar cifrado de campos sensibles (contactos de emergencia, notas médicas si se agregan) |

## 4. Guía de despliegue recomendada (breve)

- **Hosting**: Vercel para el frontend/API routes de Next.js.
- **Base de datos**: Postgres gestionado (Railway/Supabase/Neon), no SQLite en producción.
- **Storage de archivos**: Vercel Blob o S3 en vez de filesystem local.
- **Email transaccional**: Resend — ya integrado en `src/lib/email/`; solo falta `RESEND_API_KEY` y `RESEND_FROM_EMAIL` (dominio verificado en Resend) para activarlo.
- **Variables de entorno obligatorias en producción**: `AUTH_SECRET` (valor real, sin fallback), `APP_URL` (dominio real, usado en los links de invitación), sin `ALLOW_DEMO_LOGIN` (solo se define en `.env` de desarrollo).
- **Seed**: `db:seed` y usuarios demo solo corren en desarrollo/staging, nunca contra la base de producción.
