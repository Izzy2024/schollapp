---
id: S01
parent: M002
provides:
  - Botones de autocompletado de Demo en `/login`.
  - Opción de "Cerrar sesión" en todos los dashboards a través del `DashboardLayout`.
  - Pantalla global `/profile` para todos los usuarios.
  - Pantalla de administración `/admin/staff` para el alta y revisión de Docentes (Personal).
requires:
  - slice: S04 (M001)
key_files:
  - app/src/app/login/page.tsx
  - app/src/components/DashboardLayout.tsx
  - app/src/app/admin/staff/page.tsx
  - app/src/app/profile/page.tsx
key_decisions:
  - "El menú inferior del usuario ahora despliega un popover on hover para acceso rápido a Mi Perfil y Logout."
  - "La pantalla de docentes (Staff) se creó idéntica en estructura a la de Alumnos, pero en el backend usa su propia tabla `Staff` ligada al tenant. Esto permite asignar a estos docentes recién creados a clases/materias en el panel de Gestión de Clases sin problemas."
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-summary.md
  - .gsd/milestones/M002/slices/S01/tasks/T02-summary.md
completed_at: 2026-03-12T01:15:00Z
---

# S01: Ajustes de UI y Mantenimiento de Docentes

**Pulido de la UX de login/logout y gestión inicial del profesorado para Control Escolar.**

## What Happened
Se agregaron mejoras de calidad de vida solicitadas: 
1. La pantalla `/login` ahora tiene 4 botones discretos en la parte inferior para que durante el desarrollo (MVP demo) uno pueda loguearse como Admin, Director, Docente o Alumno con un solo click.
2. Todo el mundo ahora puede **cerrar su sesión** pasando el ratón sobre su nombre abajo a la izquierda en la barra lateral, lo que muestra el botón rojo de Logout.
3. Al dar clic en "Mi Perfil", se abre `/profile`, una pantalla neutra y global que muestra la ID del usuario, su escuela (Tenant ID) y los roles asociados a su token.
4. El administrador ahora cuenta con una nueva opción en el menú: **Docentes / Staff**. Desde ahí puede ver la plantilla actual de profesores, registrar a nuevos profesores y ver cuántas clases tienen ya asignadas (pudiendo asociar las clases vacías usando la sección Gestión de Clases).