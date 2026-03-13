# T01: API / Server Actions para Ciclos y Grados

**Slice:** S02
**Milestone:** M001

## Goal
Crear las funciones backend seguras (Server Actions) para gestionar (CRUD) los Modelos de Configuración Académica base: `AcademicYear` y `GradeLevel`.

## Must-Haves

### Truths
- "Un admin puede consultar la lista de años académicos del tenant."
- "Un admin puede crear un nuevo año académico (validando que las fechas no se traslapen y estableciendo uno como activo)."
- "Un admin puede crear nuevos grados escolares asignando un nombre y código único para el tenant."

### Artifacts
- `app/src/actions/academic.ts` — Contiene al menos las funciones `getAcademicYears`, `createAcademicYear`, `updateAcademicYear`, `getGradeLevels`, `createGradeLevel`, `updateGradeLevel`.

### Key Links
- Todas las funciones deben incluir la cabecera segura de autenticación:
  ```typescript
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;
  ```

## Steps
1. Crear el archivo `app/src/actions/academic.ts`.
2. Implementar CRUD básico para `AcademicYear`.
   - `getAcademicYears()`
   - `createAcademicYear(name, startDate, endDate)`
   - `setAcademicYearActive(id)`
3. Implementar CRUD básico para `GradeLevel`.
   - `getGradeLevels()`
   - `createGradeLevel(name, code, sortOrder)`
4. Asegurar que las validaciones contemplan que no existan duplicados por `name` o `code` dentro del mismo `tenantId`.