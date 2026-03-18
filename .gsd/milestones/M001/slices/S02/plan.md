# S02: Configuración Académica (CRUD)

**Goal:** Completar el panel de configuración académica permitiendo a los administradores gestionar ciclos escolares, grados y grupos (secciones).
**Demo:** Un admin puede ir a la vista "Ciclos y Grados", crear un nuevo "Ciclo Escolar 2026-2027", crear grados ("1° Secundaria"), y grupos para ese grado y ciclo ("A", "B").

## Must-Haves
- Interfaz (UI) para listar, crear, editar y eliminar `AcademicYear`.
- Interfaz para listar, crear, editar y eliminar `GradeLevel`.
- Interfaz para listar, crear, editar y eliminar `Section` dentro de un grado y ciclo.
- Backend (Server Actions) seguros que extraigan el `tenantSlug` / `tenantId` de la sesión usando `auth()`.

## Tasks

- [x] **T01: API / Server Actions para Ciclos y Grados**
  Crear los Server Actions con soporte Multi-Tenant (usando `auth()`) para el CRUD de `AcademicYear` y `GradeLevel`.
  
- [x] **T02: UI de Configuración de Ciclos y Grados**
  Crear la página `/admin/academic-setup` (o equivalente) que consuma los actions de T01.
  
- [x] **T03: API y UI para Grupos (Sections)**
  Crear las acciones y la UI (ya sea en la misma pantalla o una dedicada) para gestionar los Grupos (`Section`) cruzando Ciclo + Grado.

## Files Likely Touched
- `app/src/actions/academic.ts`
- `app/src/app/admin/academic/page.tsx`
- `app/src/app/admin/layout.tsx` o `page.tsx` (para inyectar el menú).