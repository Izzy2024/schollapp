# S03: Gestión de Expedientes (Alumnos y Tutores)

**Goal:** Completar el módulo donde el administrador (Control Escolar) puede dar de alta, editar y listar a los estudiantes y a sus tutores (padres), y ver su información detallada.
**Demo:** Un admin entra a "Estudiantes", hace clic en "Nuevo", rellena los datos de un alumno y su tutor (vinculándolos), y guarda. Luego, puede hacer clic en el estudiante en la lista y ver su perfil detallado con pestañas de info, tutores e inscripciones.

## Must-Haves
- Listado de Estudiantes (`app/admin/students/page.tsx`) adaptado con acciones de visualización, creación y edición.
- Un formulario (modal o página dedicada) para registrar Estudiantes (`Student`) incluyendo campos base como Nombre, Matrícula, Fecha de Nacimiento y Email.
- CRUD o vinculación de Tutores (`Guardian`) al estudiante mediante el modelo `StudentGuardian`.
- Pantalla de Detalles del Estudiante (`app/admin/students/[studentId]/page.tsx`) con pestañas para ver "Overview", "Tutores" y "Actividad".

## Tasks

- [x] **T01: API / Server Actions para Estudiantes y Tutores**
  Crear y/o actualizar `actions/students.ts` y `actions/guardians.ts` para dar soporte al CRUD con multi-tenant seguro.

- [x] **T02: UI de Listado y Creación Rápida de Alumnos**
  Adaptar la pantalla `/admin/students` para tener el listado y un modal que permita la creación rápida de alumnos.

- [x] **T03: Pantalla de Expediente del Alumno (Tabs y Tutores)**
  Crear la ruta `[studentId]/page.tsx` para mostrar un dashboard individual del alumno, y añadir una sección donde se le puedan vincular Tutores (Guardians).

## Files Likely Touched
- `app/src/actions/students.ts`
- `app/src/actions/guardians.ts`
- `app/src/app/admin/students/page.tsx`
- `app/src/app/admin/students/[studentId]/page.tsx`