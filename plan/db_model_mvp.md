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
