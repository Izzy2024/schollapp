# T03: Pantalla de Expediente del Alumno (Tabs y Tutores)

**Slice:** S03
**Milestone:** M001

## Goal
Crear la vista de detalle de un estudiante, incluyendo la posibilidad de vincular nuevos tutores.

## Must-Haves

### Truths
- "Un admin puede ver la página `/admin/students/[studentId]` mostrando la información básica del estudiante."
- "La página cuenta con Tabs: 'Overview', 'Tutores' y 'Actividad/Historial'."
- "En el Tab de Tutores, el administrador puede crear y vincular un Tutor (Guardian) a este alumno, y también desvincularlo."

### Artifacts
- `app/src/app/admin/students/[studentId]/page.tsx` — Creado y consumiendo `getStudentById` de T01.

### Key Links
- `/admin/students/[studentId]` hace el fetch y renderiza los componentes.

## Steps
1. Crear carpeta `app/src/app/admin/students/[studentId]`.
2. Crear `page.tsx`.
3. Cargar el estudiante vía `getStudentById`.
4. Montar la UI de Tabs (usar state de React local para conmutar tabs).
5. En la pestaña de Tutores, listar `student.guardians.map(g => g.guardian)`.
6. Añadir botón y modal para "Añadir Tutor" llamando a `createGuardianAndLink`.
7. Actualizar el DashboardLayout breadcrumb para soportar la navegación hacia atrás.
8. Ejecutar `npx tsc --noEmit`.