# T02: UI de Configuración de Ciclos y Grados

**Slice:** S02
**Milestone:** M001

## Goal
Crear una pantalla en el dashboard de administrador (`/admin/academic`) para consumir las funciones de T01 y permitir gestionar ciclos escolares y grados.

## Must-Haves

### Truths
- "Un admin navega a `/admin/academic` y puede ver la lista de ciclos y la lista de grados."
- "El usuario puede llenar un modal/formulario para crear un nuevo ciclo."
- "El usuario puede llenar un modal/formulario para crear un nuevo grado."
- "Se puede marcar un ciclo como 'Activo'."

### Artifacts
- `app/src/app/admin/academic/page.tsx` — Interfaz principal dividida en dos secciones (Ciclos y Grados).

### Key Links
- `/admin/academic` → `getAcademicYears()`, `getGradeLevels()` de `actions/academic.ts`.

## Steps
1. Crear carpeta `app/src/app/admin/academic`.
2. Crear archivo `page.tsx` configurando el layout general.
3. Añadir el estado y useEffect (o Server Component data fetching si es posible) para cargar `academicYears` y `gradeLevels`. (Es preferible usar un Client Component con `useEffect` para re-utilizar la estructura de UI actual).
4. Implementar las tablas para mostrar la información.
5. Implementar los modales para `Nuevo Ciclo` (Nombre, Fecha Inicio, Fecha Fin) y `Nuevo Grado` (Nombre, Código, Orden).
6. Implementar botones de "Activar" para los ciclos, y "Eliminar" para los grados.
7. Añadir un enlace a `/admin/academic` en el menú (podría ubicarse bajo Configuración > Académico o Configuración General).
