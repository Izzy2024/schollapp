# Arquitectura de APPSSCHOLL

## 1. Visión general

APPSSCHOLL usa un patrón BFF con Next.js:

- Las páginas (`src/app`) consumen Server Actions (`src/actions`).
- Las Server Actions hablan con Prisma (`src/lib/prisma.ts`).
- Prisma persiste en SQLite (`dev.db`).

## 2. Capas

### UI (Next App Router)

- Rutas por rol:
  - `/admin/*`
  - `/director/*`
  - `/teacher/*`
  - `/student/*`
  - `/parent/*`

### Dominio (Server Actions)

- Cada módulo tiene archivo propio:
  - `classRequests.ts`
  - `scheduleRequests.ts`
  - `adminClasses.ts`
  - `enrollment.ts`
  - `attendance.ts`
  - `gradebook.ts`
  - `planning.ts`

### Persistencia

- Prisma Client singleton desde `src/lib/prisma.ts`
- Modelo completo en `prisma/schema.prisma`

## 3. Entidades principales

- `Tenant`: partición multi-tenant
- `User`, `Staff`, `Student`: personas
- `GradeLevel`, `Section`, `Subject`: catálogo académico
- `SectionSubject`: clase (materia + sección + docente)
- `ClassRequest`: solicitud docente de clase
- `ClassSchedule`: horario oficial de clase
- `ScheduleRequest`: solicitud de horario/cambio
- `Enrollment`: inscripción de estudiante a sección
- `AttendanceSession` / `AttendanceRecord`
- `Evaluation` / `GradeRecord`

## 4. Estrategia de refresco de datos

Después de mutaciones relevantes, se usa `revalidatePath(...)` para mantener la UI actualizada.

Rutas frecuentemente revalidadas:

- `/teacher`
- `/teacher/classes/[id]`
- `/teacher/schedule`
- `/admin/class-requests`
- `/director/class-requests`
- `/admin/schedule-requests`
- `/director/schedule-requests`

## 5. Datos base de primaria

`src/lib/defaultPrimaryCatalog.ts` asegura catálogo mínimo del tenant:

- Grados 1° a 6° primaria
- Secciones A/B
- Materias núcleo
- `SectionSubject` base sin docente asignado

Esto previene escenarios de tenant "vacío" en flujos de solicitud/asignación.
