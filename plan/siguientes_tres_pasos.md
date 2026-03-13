# Paquete de siguientes pasos


## 1) Backlog MVP


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



## 2) Modelo DB MVP


# Modelo de Base de Datos (PostgreSQL) — MVP inicial
> Diseño SaaS multi-tenant: **una sola BD** con columna `tenant_id` en tablas “core”.  
> Objetivo: integridad, reportes rápidos y escalabilidad.

---

## Principios de diseño
- PK: `uuid` (gen_random_uuid()).
- Todas las tablas “core” incluyen:
  - `tenant_id uuid not null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - `created_by uuid null` (user id)
  - `updated_by uuid null`
- Índices compuestos por tenant:
  - `(tenant_id, id)` implícito por PK pero conviene `(tenant_id, <campo frecuente>)` para búsquedas.
- Campos flexibles (metadata):
  - JSONB en activity log y algunas configuraciones.

---

## Entidades principales (ER textual)
- **tenants** 1—N **users** (vía user_memberships)
- **tenants** 1—N **academic_years** 1—N **terms**
- **academic_years** 1—N **sections** (grupos)
- **grade_levels** 1—N **sections**
- **sections** N—N **subjects** (section_subjects)
- **students** 1—N **enrollments** N—1 **sections**
- **students** N—N **guardians** (student_guardians)
- **sections** 1—N **attendance_sessions** 1—N **attendance_records**
- **students** 1—N **attachments**
- **tenants** 1—N **activity_events** (referencia a cualquier entidad)
- (Opcional) **billing**: invoices, invoice_lines, payments

---

## Tablas (MVP)
### 1) SaaS, usuarios y permisos
- `tenants`
- `users`
- `user_memberships` (user ↔ tenant)
- `roles`
- `permissions`
- `role_permissions`
- `user_roles` (en un tenant)

### 2) Configuración académica
- `academic_years`
- `terms`
- `grade_levels`
- `sections` (grupos)
- `subjects`
- `section_subjects` (opcional: teacher/staff)

### 3) Personas y expedientes
- `students`
- `guardians`
- `student_guardians`
- `staff` (docentes/admin)
- `attachments` (documentos)

### 4) Inscripción
- `enrollments`

### 5) Asistencia
- `attendance_sessions` (por grupo + fecha)
- `attendance_records` (por alumno)

### 6) Comunicación (MVP anuncios)
- `announcements`
- `announcement_targets`

### 7) Bitácora
- `activity_events`

### 8) (Opcional) Cobranza
- `charge_items`
- `invoices`
- `invoice_lines`
- `payments`
- `payment_allocations`

---

## DDL base (SQL) — tablas core
> Esto es un “starter schema”. Ajustar campos según país/proceso.  
> Recomendación: usar migraciones (Prisma / Drizzle / TypeORM / Flyway).

```sql
-- Extensiones útiles
create extension if not exists pgcrypto; -- gen_random_uuid()

-- TENANTS
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- USERS
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  is_active boolean not null default true,
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MEMBERSHIP (user pertenece a tenant)
create table if not exists user_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'active', -- active/invited/suspended
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- ROLES
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null, -- Dirección, Control Escolar, Finanzas
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- students.read, students.write, attendance.write...
  description text null
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists user_roles (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (tenant_id, user_id, role_id)
);

-- ACADEMIC CONFIG
create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null, -- 2026-2027
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists terms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  name text not null, -- Bimestre 1
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists grade_levels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null, -- "1", "2", "3" o "Primaria 1"
  name text not null,
  sort_order int not null default 0,
  unique (tenant_id, code)
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  grade_level_id uuid not null references grade_levels(id),
  name text not null, -- "A", "B" o "1A"
  capacity int null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, academic_year_id, grade_level_id, name)
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text null,
  name text not null,
  unique (tenant_id, name)
);

create table if not exists section_subjects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  section_id uuid not null references sections(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  staff_id uuid null, -- docente asignado (opcional)
  unique (tenant_id, section_id, subject_id)
);

-- PEOPLE
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_code text null, -- matrícula
  first_name text not null,
  last_name text not null,
  dob date null,
  national_id text null, -- CURP / DNI / etc.
  phone text null,
  email text null,
  address_json jsonb null,
  status text not null default 'active', -- active/inactive
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, student_code)
);

create index if not exists idx_students_tenant_name
on students (tenant_id, last_name, first_name);

create table if not exists guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  relationship text null, -- padre/madre/tutor
  phone text null,
  email text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_guardians (
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (tenant_id, student_id, guardian_id)
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid null references users(id) on delete set null,
  full_name text not null,
  role_label text null, -- docente, admin, etc.
  email text null,
  phone text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ENROLLMENTS
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  section_id uuid not null references sections(id),
  status text not null default 'enrolled', -- pre_enrolled/enrolled/withdrawn/graduated
  enrolled_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, student_id, academic_year_id)
);

create index if not exists idx_enrollments_tenant_section
on enrollments (tenant_id, section_id);

-- ATTENDANCE
create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  section_id uuid not null references sections(id) on delete cascade,
  date date not null,
  taken_by uuid null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, section_id, date)
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  attendance_session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null, -- present/absent/late/excused
  note text null,
  evidence_attachment_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, attendance_session_id, student_id)
);

create index if not exists idx_attendance_records_student_date
on attendance_records (tenant_id, student_id);

-- ATTACHMENTS
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_type text not null, -- 'student','guardian','attendance','announcement'...
  owner_id uuid not null,
  file_key text not null, -- ruta en S3
  file_name text not null,
  content_type text null,
  size_bytes bigint null,
  created_at timestamptz not null default now()
);

create index if not exists idx_attachments_owner
on attachments (tenant_id, owner_type, owner_id);

-- ANNOUNCEMENTS
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid null references users(id) on delete set null,
  published_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists announcement_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  announcement_id uuid not null references announcements(id) on delete cascade,
  target_type text not null, -- 'all','grade','section','student'
  target_id uuid null
);

-- ACTIVITY LOG
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_user_id uuid null references users(id) on delete set null,
  entity_type text not null, -- 'student','enrollment','attendance_record','announcement'
  entity_id uuid not null,
  action text not null, -- 'created','updated','deleted','sent','imported'
  occurred_at timestamptz not null default now(),
  metadata jsonb null
);

create index if not exists idx_activity_events_time
on activity_events (tenant_id, occurred_at desc);

create index if not exists idx_activity_events_entity
on activity_events (tenant_id, entity_type, entity_id);
```

---

## Notas importantes (para no sufrir después)
### 1) Integridad por tenant
- En el backend: siempre filtrar por `tenant_id`.
- En DB: puedes agregar **Row-Level Security** más adelante (cuando tengas tiempo y expertise).

### 2) Rendimiento
- Para listados grandes: paginación por cursor (id/created_at).
- Activity log: index en `(tenant_id, occurred_at desc)`.

### 3) Escalamiento
- Cuando crezcas:
  - Particionar `activity_events` por mes/año.
  - Read replicas para reportes.
  - Materialized views para KPIs.

---

## Campos sugeridos por país (extensiones)
- México: CURP, RFC (tutor/empresa), folio, facturación.
- Otros: DNI, NIE, etc.



## 3) Mapa de pantallas


# Mapa de pantallas (rutas + módulos) — App web Admin
> Estructura pensada para **Next.js App Router** y un sidebar tipo dashboard (como tu ejemplo de UI).

---

## IA (Information Architecture) sugerida
Sidebar (Admin):
1. **Overview (Dashboard)**
2. **Students**
3. **Enrollment**
4. **Attendance**
5. **Messages / Announcements**
6. **Reports**
7. **Activity (Bitácora)**
8. **Settings**

---

## Rutas principales (Next.js)
### Auth
- `/login`
- `/forgot-password`
- `/reset-password`
- (Opcional) `/select-tenant` (si un usuario tiene varias escuelas)

### App (scope por tenant)
- `/:tenantSlug/overview`
- `/:tenantSlug/students`
- `/:tenantSlug/students/new`
- `/:tenantSlug/students/[studentId]`
- `/:tenantSlug/enrollment`
- `/:tenantSlug/attendance`
- `/:tenantSlug/announcements`
- `/:tenantSlug/reports`
- `/:tenantSlug/activity`
- `/:tenantSlug/settings`

---

## Pantallas y detalle funcional

## 1) Overview (Dashboard)
**Ruta:** `/:tenantSlug/overview`

**Objetivo:** “Command center” del director/control escolar.
**Widgets MVP**
- Matrícula total (ciclo activo)
- Asistencia hoy (% presente)
- Pendientes: alumnos sin documentos, inscripciones “preinscritas”
- Últimas actividades (activity feed)
- (Si hay cobranza) Morosidad: alumnos con saldo > 0

**Acciones rápidas**
- + Nuevo alumno
- Pasar lista
- Crear comunicado
- Importar CSV

---

## 2) Students (listado)
**Ruta:** `/:tenantSlug/students`

**Componentes**
- Tabla con columnas: Matrícula, Nombre, Grupo, Estatus, Tutor principal, Teléfono
- Buscador global (nombre/ID)
- Filtros: ciclo, grado, grupo, estatus
- Acciones bulk (P1): export, cambiar estatus

**Acciones**
- Ver alumno
- Editar
- Inscribir/Reinscribir (si no tiene enrollment activo)

---

## 3) Student Detail (expediente con tabs)
**Ruta:** `/:tenantSlug/students/[studentId]`

### Tabs sugeridos (MVP)
1. **Overview**
   - Datos principales, foto, estatus
   - Grupo actual, ciclo actual
   - “Quick actions”: Inscribir, Registrar incidencia (P1), Adjuntar documento
2. **Guardians**
   - Lista tutores vinculados + “Tutor principal”
3. **Enrollment**
   - Historial de inscripciones por ciclo, cambios y estatus
4. **Attendance**
   - Resumen mensual (%), lista de faltas/retardos
5. **Documents**
   - Archivos adjuntos con tags
6. **Activity**
   - Timeline tipo “Activity Calendar / Agenda” filtrable

> Nota: Esta tab de **Activity** es tu diferencial si queda bien implementada.

---

## 4) Enrollment (control escolar)
**Ruta:** `/:tenantSlug/enrollment`

**Vistas**
- Vista por ciclo (selector)
- Tabla: Alumno, grupo, estatus, fecha, responsable
- Botón: “Inscribir alumno”
- Wizard:
  1) Buscar/crear alumno
  2) Seleccionar ciclo + grado + grupo
  3) Confirmar (valida cupo)
  4) Genera activity event

**Puntos clave**
- Validación de cupos
- Cambios de grupo (P1) con trazabilidad

---

## 5) Attendance
**Ruta:** `/:tenantSlug/attendance`

### Sub-vistas
- `/:tenantSlug/attendance/take` (pasar lista)
- `/:tenantSlug/attendance/report` (reportes)

**Pasar lista (MVP)**
- Selector: fecha + grupo
- Lista alumnos (con quick toggles)
- Acciones:
  - Marcar todos presentes
  - Guardar
  - Adjuntar evidencia por alumno (P1)
- Permisos:
  - Editar después de X horas (configurable P1)
  - Solo Dirección puede cambiar faltas justificadas (P1)

**Reporte**
- Filtros: fecha rango, grupo, alumno
- Export CSV

---

## 6) Announcements (comunicados)
**Ruta:** `/:tenantSlug/announcements`

**MVP**
- Listado de comunicados (draft/published)
- Crear comunicado:
  - título, cuerpo, adjuntos (P1)
  - targets: toda la escuela / grado / grupo
- Publicar y registrar en activity log

---

## 7) Reports
**Ruta:** `/:tenantSlug/reports`

**MVP**
- Asistencia:
  - por grupo
  - por alumno
- Matrícula:
  - alumnos por grupo
  - altas/bajas por periodo (P1)
- Export CSV

> Consejo: Mantén pocos reportes pero muy útiles. El exceso abruma.

---

## 8) Activity (bitácora global)
**Ruta:** `/:tenantSlug/activity`

**Diseño recomendado (como tu UI)**
- Toggle: “Agenda” / “Calendario”
- Filtros:
  - fecha, tipo de evento, actor, alumno
- Tarjetas por evento:
  - icono + tipo (asistencia, inscripción, edición de datos, comunicado)
  - timestamp
  - link al objeto (alumno, grupo, etc.)

**Eventos MVP**
- student.created / student.updated
- guardian.linked
- enrollment.created / enrollment.updated
- attendance.taken / attendance.updated
- announcement.published
- import.completed / import.failed

---

## 9) Settings
**Ruta:** `/:tenantSlug/settings`

### Secciones (MVP)
- **School profile**: nombre, timezone, logo
- **Academic setup**: ciclos, periodos, grados, grupos, materias
- **Users & roles**: invitar usuario (P1), asignar roles
- **Import/Export**: importar alumnos/tutores, export alumnos

---

## Componentes UI reutilizables (te ahorran semanas)
- DataTable (server-side): búsqueda, filtros, paginación
- Modal Wizard (inscripción, importación)
- FileUploader con presigned URLs
- ActivityCard + ActivityTimeline
- PermissionGate (oculta UI según RBAC)
- Toast + confirm dialogs

---

## Flujos end-to-end del MVP (para validar producto)
1) **Setup de escuela**
   - Crear ciclo → grados → grupos → materias
2) **Cargar alumnos**
   - Import CSV + corrección de errores
3) **Inscribir**
   - Inscribir alumno a grupo → queda registro (activity)
4) **Operación diaria**
   - Pasar lista → reportes → activity
5) **Comunicación**
   - Comunicado → activity + notificación in-app

---

## Siguiente paso recomendado
Una vez tengas estas pantallas definidas:
- Diseña un **Design System mínimo** (botones, inputs, tablas)
- Implementa primero el **DataTable + filtros** y el **Activity feed**: son la base del resto.
