# Backlog MVP (épicas → historias → tareas)
> Enfoque: **Administradores / control escolar / dirección**.  
> Objetivo del MVP: que una escuela pueda **configurarse**, **registrar alumnos**, **organizar grupos**, **tomar asistencia**, **llevar bitácora** y **generar reportes básicos** (y opcionalmente **cobranza básica** si apuntas a privados).

---

## Convenciones
- **Prioridad**
  - **P0**: obligatorio para vender el MVP
  - **P1**: importante, pero puede salir en la siguiente iteración
  - **P2**: nice-to-have
- **Tamaño (estimación)**
  - **S** (1–2 días), **M** (3–5 días), **L** (1–2 semanas) por feature completo (front+back+QA)

---

## ÉPICA 0 — Fundaciones del producto (P0)
### US0.1 Autenticación + sesión (P0, M)
**Como** usuario admin  
**Quiero** iniciar sesión y mantener sesión segura  
**Para** acceder a la plataforma.

**Criterios de aceptación**
- Login con email + password
- Reset password por correo
- Refresh token / sesión persistente
- Bloqueo básico por intentos (rate limiting)

**Tareas**
- Backend: endpoints auth (login, refresh, reset), hashing (Argon2/bcrypt), rate limit
- Frontend: páginas /login, /forgot-password, /reset
- Infra: secretos, variables de entorno, correo transaccional (SendGrid/Mailgun)
- QA: tests de login, reset, expiración

### US0.2 Multi-tenant (escuelas) (P0, L)
**Como** plataforma SaaS  
**Quiero** aislar los datos por escuela (**tenant**)  
**Para** operar múltiples escuelas con seguridad.

**Criterios de aceptación**
- Todo registro “core” tiene `tenant_id`
- Un usuario puede pertenecer a 1+ escuelas (opcional)
- No se puede acceder a datos de otro tenant

**Tareas**
- Backend: middleware/guard que inyecta `tenant_id` desde sesión
- DB: índices compuestos `(tenant_id, ...)`
- Front: selector de escuela si aplica
- QA: pruebas de aislamiento (intento de leer/editar otro tenant)

### US0.3 Roles y permisos (RBAC) (P0, M)
**Como** director/administrador  
**Quiero** roles (Dirección, Control escolar, Finanzas, Docente-lectura)  
**Para** controlar accesos.

**Criterios de aceptación**
- Al menos 4 roles predefinidos
- Permisos por módulo: ver/crear/editar/eliminar
- Auditoría de cambios críticos

**Tareas**
- Backend: tablas roles/permisos + guards
- Front: UI de asignación de rol a usuario (mínimo)
- QA: matrix de permisos

---

## ÉPICA 1 — Configuración académica (P0)
### US1.1 Ciclos escolares y periodos (P0, M)
**Como** control escolar  
**Quiero** crear un ciclo escolar (2026-2027) con periodos  
**Para** organizar la operación.

**Aceptación**
- CRUD de ciclo (activo/inactivo)
- CRUD de periodos (bimestre/trimestre/semestre)
- Validaciones de fechas (no traslapar)

**Tareas**
- Backend: academic_years, terms
- Front: Settings → Académico
- QA: validaciones fechas

### US1.2 Grados, grupos y materias (P0, L)
**Como** control escolar  
**Quiero** definir grados (1°,2°), grupos (1A,1B) y materias  
**Para** crear estructura escolar.

**Aceptación**
- CRUD grado
- CRUD grupo/section (grado + ciclo)
- CRUD materia
- (Opcional P1) asignación de docente por materia/grupo

**Tareas**
- Backend: grade_levels, sections, subjects, section_subjects
- Front: pantallas CRUD con tablas + filtros
- QA: duplicados por nombre en mismo ciclo

---

## ÉPICA 2 — Personas y expedientes (P0)
### US2.1 Expediente del alumno (P0, L)
**Como** admin  
**Quiero** crear/editar alumnos con datos y documentos  
**Para** tener información centralizada.

**Aceptación**
- Datos básicos: nombre, CURP/ID, fecha nac., contacto, dirección, estatus
- Foto opcional
- Documentos: acta, boleta, etc. (subida a almacenamiento)
- Búsqueda por nombre/ID
- Historial de cambios visible (activity)

**Tareas**
- Backend: students, attachments
- Front: Students list + Student detail (tabs)
- Infra: S3 compatible (uploads firmados)
- QA: permisos, validación campos

### US2.2 Tutores/guardianes y relación (P0, M)
**Como** admin  
**Quiero** registrar tutores y vincularlos a alumnos  
**Para** comunicación y responsabilidades.

**Aceptación**
- CRUD de guardian
- Relación many-to-many alumno↔tutor
- Marcar tutor principal

**Tareas**
- Backend: guardians, student_guardians
- Front: UI de vinculación en expediente del alumno
- QA: duplicados por email/teléfono

### US2.3 Personal (staff) mínimo (P0, M)
**Como** admin  
**Quiero** registrar personal (docentes/admin)  
**Para** asignarlos y dar accesos.

**Aceptación**
- CRUD staff básico
- Crear usuario asociado (opcional)
- Asignar rol

**Tareas**
- Backend: staff, users
- Front: Staff list + detail
- QA: permisos

---

## ÉPICA 3 — Inscripción / Reinscripción (P0)
### US3.1 Flujo de inscripción (P0, L)
**Como** control escolar  
**Quiero** inscribir a un alumno a un grupo en un ciclo  
**Para** tener matrícula actual.

**Aceptación**
- Crear “enrollment” con estatus: preinscrito / inscrito / baja / egresado
- Validar cupo máximo por grupo
- Registrar fecha y responsable

**Tareas**
- Backend: enrollments, cupos por section
- Front: acción “Inscribir” desde alumno o desde grupo
- QA: validación cupo

### US3.2 Importación desde Excel/CSV (P0, L)
**Como** admin  
**Quiero** importar alumnos y tutores desde plantilla  
**Para** arrancar rápido.

**Aceptación**
- Plantilla descargable
- Previsualización y validación
- Reporte de errores por fila
- Detección de posibles duplicados

**Tareas**
- Backend: import_jobs + parser
- Front: wizard de importación
- QA: casos con errores y duplicados

---

## ÉPICA 4 — Asistencia (P0)
### US4.1 Asistencia diaria por grupo (P0, L)
**Como** control escolar  
**Quiero** pasar lista por grupo y día  
**Para** controlar ausencias y retardos.

**Aceptación**
- Vista por fecha + grupo
- Estados: presente / falta / retardo / justificado
- Comentario opcional y evidencia (archivo)
- Bloqueo/edición con permisos (ej. solo dirección puede editar después)

**Tareas**
- Backend: attendance_sessions, attendance_records
- Front: UI “Pasar lista” rápida (bulk)
- QA: concurrencia básica + permisos

### US4.2 Reportes de asistencia (P0, M)
**Como** dirección  
**Quiero** reportes por alumno, grupo y rango de fechas  
**Para** detectar problemas.

**Aceptación**
- % asistencia por alumno
- Top ausencias por grupo
- Export CSV

**Tareas**
- Backend: queries agregadas + export
- Front: filtros + tabla + export
- QA: performance con datos

---

## ÉPICA 5 — Comunicación (P0/P1)
### US5.1 Anuncios internos (P0, M)
**Como** dirección  
**Quiero** publicar anuncios a grupos o a toda la escuela  
**Para** comunicar rápido.

**Aceptación**
- Crear anuncio con título, cuerpo, targets (grupo/grade/todos)
- Notificación in-app (MVP)
- Log de envío

**Tareas**
- Backend: announcements, announcement_targets
- Front: módulo “Comunicados”
- QA: permisos

### US5.2 Mensajería (P1, L)
**Como** admin  
**Quiero** enviar mensajes directos a tutores  
**Para** resolver casos individuales.

**Aceptación**
- Conversaciones 1:1 o 1:m
- Historial
- (Opcional) plantillas

**Tareas**
- Backend: threads, messages
- Front: inbox
- QA: permisos

---

## ÉPICA 6 — Bitácora / Activity feed (P0)
### US6.1 Activity Log global y por alumno (P0, L)
**Como** dirección  
**Quiero** ver un timeline de actividad  
**Para** auditoría y claridad (quién cambió qué).

**Aceptación**
- Evento automático para: crear/editar alumno, inscripción, asistencia, pagos (si aplica), anuncios
- Vista por fecha (calendario/agenda) con filtros
- Vista dentro del expediente del alumno

**Tareas**
- Backend: activity_events (JSONB metadata), hooks en servicios
- Front: Activity Calendar + filtros
- QA: consistencia y paginación

---

## ÉPICA 7 — Cobranza básica (si apuntas a privadas) (P0 opcional / P1)
> Si tu mercado inicial es **privadas**, esto puede ser P0. Si no, muévelo a P1.

### US7.1 Conceptos de cobro + generación de estado de cuenta (P1, L)
**Como** finanzas  
**Quiero** definir cuotas (inscripción, mensualidad) y generar cargos  
**Para** controlar pagos.

**Aceptación**
- Catálogo de conceptos
- Generar “invoices” por alumno (mensual/única)
- Estado de cuenta por alumno

**Tareas**
- Backend: charge_items, invoices, invoice_lines
- Front: Billing (alumnos + detalle)
- QA: cálculos

### US7.2 Registro de pagos manual (P1, M)
**Como** finanzas  
**Quiero** registrar pagos (efectivo/transferencia)  
**Para** reflejar saldos.

**Aceptación**
- Registrar pago parcial o total
- Recibo básico (PDF P1)
- Activity event de pago

**Tareas**
- Backend: payments + aplicación a invoices
- Front: formulario de pago
- QA: parciales y totales

---

## Release sugerido (6–8 semanas de MVP)
- **Sprint 1**: Épica 0 (auth, tenant, RBAC) + base UI
- **Sprint 2**: Épica 1 (ciclo, grupos, materias)
- **Sprint 3**: Épica 2 (alumnos/tutores/personal) + uploads
- **Sprint 4**: Épica 3 (inscripción) + Épica 4 (asistencia v1)
- **Sprint 5**: Épica 6 (activity log) + reportes asistencia
- **Sprint 6**: Comunicación (anuncios) + pulido + hardening + deploy

---

## Definición de “Listo” (DoD)
- Tests mínimos: unit + e2e smoke
- Logs/auditoría en acciones críticas
- Errores monitoreados (Sentry)
- Roles probados
- Export CSV de lo crítico (alumnos, asistencia)
