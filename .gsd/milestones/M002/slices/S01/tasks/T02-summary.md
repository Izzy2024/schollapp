---
id: T02
parent: S01
milestone: M002
provides:
  - Pantalla global `/profile` disponible para todos los usuarios, mostrando su información de sesión y permitiéndoles cerrar sesión de manera limpia.
  - Server actions para el CRUD de `Staff` (Docentes).
  - Nueva pantalla `/admin/staff` para el listado, búsqueda y creación (alta) de docentes.
requires:
  - slice: S01 (M001)
    provides: Componentes de Layout Base y Auth.
affects: [S01]
key_files:
  - app/src/app/profile/page.tsx
  - app/src/app/admin/staff/page.tsx
  - app/src/actions/staff.ts
key_decisions:
  - "El modelo de `Staff` en la BD ya existía, pero estaba atado manualmente a `User` por la semilla. Ahora el administrador puede dar de alta docentes solo con nombre/contacto sin forzar a crear la cuenta de usuario primero (el flujo de login/invitación de docentes queda para el futuro o cuando se liguen cuentas reales)."
  - "La página de perfil fue creada como Server Component puro ya que solo lee información inmutable de la sesión activa y expone un formulario simple para logout."
patterns_established:
  - "Las pantallas de lista de usuarios (estudiantes o docentes) comparten el mismo patrón de diseño (Header con contador, Search Input y tabla responsive)."
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T02-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-12T01:10:00Z
---

# T02: Perfil y CRUD Docentes

**Habilitación de autogestión de perfil y módulo de personal.**

## What Happened
Se desarrolló la ruta `/profile` que funge como un hub global para cualquier usuario (Admin, Estudiante, Docente). Esta pantalla lista los datos de pertenencia al Tenant actual, ID y sus roles cargados del token, además de ofrecer el botón unificado de salida. 

Por otro lado, se dotó al administrador de un CRUD básico en `/admin/staff` consumiendo nuevos server actions (`getStaffList` y `createStaff`). Desde esta vista el Control Escolar puede inscribir nuevos docentes y revisar cuántas clases tiene asignadas cada profesor actual, replicando el exitoso UX de la tabla de estudiantes.

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/actions/staff.ts` — Acciones back-end para staff.
- `app/src/app/admin/staff/page.tsx` — Interfaz visual de listado y modal de docentes.
- `app/src/app/profile/page.tsx` — Interfaz de cuenta y cierre de sesión.