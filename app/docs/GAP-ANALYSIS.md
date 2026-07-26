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

### A medias

| Módulo | Qué falta |
|---|---|
| Gradebook | Captura notas (`gradebook.ts`) pero sin ponderación por tipo de evaluación, sin escala configurable, sin cálculo de promedio por período |
| Rol parent | 7 páginas, pero no ve notas ni asistencia del hijo; `parent/documents` usa un scope de attachments hardcodeado (`'tenant','general'`) |
| Attachments | `attachments.ts` guarda en filesystem local (`fs/promises`) — no escala en serverless ni multi-instancia |
| RBAC granular | Modelos `Permission`/`RolePermission` existen y se siembran, pero el runtime enruta por nombre de rol string, no por permiso |
| Páginas M009 recicladas | `director/resources` (deriva de `ClassSchedule.room`, sin modelo `Room`), `director/accreditation` (es el feed de `ActivityEvent` renombrado), `student/analytics`/`student/reports` (mismo `getStudentGrades()`, distinto render) |

### Inexistentes

Boletas de calificaciones (report cards) con promedio y PDF, entrega de tareas por el alumno (deadline, archivo, feedback), notificaciones externas (email/SMS/push), admisiones (pipeline de aspirantes), conducta/disciplina, promoción/rollover de año académico, certificados y constancias oficiales, rúbricas y evaluación por competencias, reservas de aulas/recursos, biblioteca, transporte, cafetería, enfermería, RRHH/nómina de personal, inventario/activos, pasarela de pago online, integraciones externas (Google Classroom, SIS estatal), portal público del colegio, recuperación de contraseña por email.

## 2. Brechas priorizadas

### P0 — bloqueantes para uso real

1. ~~**Registro por código de invitación**~~ — **Hecho.** `invitations.ts` + `/register`; admin genera código por persona (Staff/Student/Guardian), `mustChangePassword` fuerza cambio en el primer login con contraseña temporal.
2. ~~**Backdoor de login demo**~~ — **Hecho.** Gateado tras `ALLOW_DEMO_LOGIN=1` (solo `.env` de desarrollo); también se eliminó el fallback de roles por substring de email.
3. **Boletas de calificaciones** con ponderación, promedio por período y export PDF — el gradebook actual no calcula promedios.
4. **Portal del padre real** — ver notas y asistencia del hijo, no solo finanzas/mensajes/documentos.
5. **Migración SQLite → Postgres** — 9 modelos financieros con escritura concurrente multi-tenant no son seguros en SQLite en producción.
6. **Attachments a object storage** (Vercel Blob / S3) — filesystem local no sobrevive a despliegues serverless multi-instancia.
7. **Notificaciones por email** — sin esto, anuncios/mensajes/recordatorios de cobranza no llegan fuera de la app.

### P1 — para un SIS completo

- Entrega de tareas (submission del alumno, fecha límite, archivo, feedback del docente).
- Admisiones: formulario de aspirante, examen, conversión a matrícula (`Enrollment.status` ya tiene `pre_enrolled` pero sin pipeline).
- Promoción/rollover de año académico (pase masivo de sección al cierre de año).
- Certificados y constancias oficiales generadas en PDF.
- Recuperación de contraseña por email (reset con token, expira).
- RBAC granular real (usar `Permission`/`RolePermission` en vez de string-matching de roles).

### P2 — ERP ampliado

Conducta/disciplina (incidentes, méritos/deméritos), biblioteca, transporte, cafetería/comedor, enfermería/salud, RRHH/nómina de personal, inventario de activos, pasarela de pago online, integraciones (Google Classroom, SIS estatal).

## 3. Checklist técnico por componente

### Autenticación

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| NextAuth v5 credentials + bcryptjs, sesión JWT con `roles[]`/`tenantId`/`tenantSlug`; registro por código de invitación (`invitations.ts`, `/register`); `mustChangePassword` obligatorio tras provisioning | Reset de contraseña por email (sin token de recuperación) | Añadir modelo `PasswordResetToken` + envío por email (Resend) |
| RBAC por prefijo de ruta en `auth.config.ts`/`auth-guards.mjs` | Solo cubre `/admin`, `/teacher`, `/director` — `/student` y `/parent` sin gate de rol | Añadir estos prefijos al RBAC de rutas |
| — | `AUTH_SECRET` con fallback hardcodeado (`'secret-for-dev-only-change-in-prod'`) | Obligatorio en producción, sin fallback silencioso |

### Base de datos

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| SQLite (`dev.db`), Prisma `db push` sin migraciones | Sin concurrencia real, sin backups gestionados, sin migraciones versionadas | Postgres gestionado (Railway, Supabase o Neon) + `prisma migrate` para producción |

### Usuarios y tenancy

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| `Staff.userId` FK real; `Tenant` particiona todo con cascade delete | `Student`/`Guardian` se resuelven por coincidencia de string de email (frágil); sesión toma solo `memberships[0]`, multi-tenant por usuario es de facto single-tenant | Corto plazo: mantener email como clave de matching (ya funciona); si un usuario necesita pertenecer a 2+ tenants, añadir selector de escuela en login |

### Despliegue

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| Next.js build estándar | Sin CI/CD documentado, sin object storage, sin envío de email | Vercel + Postgres gestionado + Vercel Blob/S3 + Resend para email transaccional |

### Seguridad de datos de menores

| Qué hay | Qué falta | Recomendación |
|---|---|---|
| Multi-tenant con aislamiento por `tenantId` | Sin política de retención de datos, sin cifrado a nivel de campo para datos sensibles, sin log de accesos a expedientes de menores | Definir retención (ej. borrar/anonimizar N años tras egreso), restringir acceso a expedientes por rol+necesidad, considerar cifrado de campos sensibles (contactos de emergencia, notas médicas si se agregan) |

## 4. Guía de despliegue recomendada (breve)

- **Hosting**: Vercel para el frontend/API routes de Next.js.
- **Base de datos**: Postgres gestionado (Railway/Supabase/Neon), no SQLite en producción.
- **Storage de archivos**: Vercel Blob o S3 en vez de filesystem local.
- **Email transaccional**: Resend (o similar) para invitaciones, recuperación de contraseña, notificaciones.
- **Variables de entorno obligatorias en producción**: `AUTH_SECRET` (valor real, sin fallback), sin `ALLOW_DEMO_LOGIN` (solo se define en `.env` de desarrollo).
- **Seed**: `db:seed` y usuarios demo solo corren en desarrollo/staging, nunca contra la base de producción.
