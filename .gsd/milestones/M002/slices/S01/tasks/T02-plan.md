# T02: Perfil y CRUD Docentes

**Slice:** S01
**Milestone:** M002

## Goal
Implementar la interfaz que permita a los administradores registrar, editar e inscribir docentes al colegio (similar al flujo actual de estudiantes).
Adicionalmente, crear una pantalla de "Mi Perfil" en `/profile` donde cualquier usuario pueda ver sus datos básicos (y potencialmente editarlos o cambiar contraseña a futuro).

## Must-Haves

### Truths
- "Un admin puede entrar a `/admin/staff` y ver la lista de docentes."
- "Se puede registrar un nuevo docente desde esa misma pantalla usando un modal."
- "El usuario puede hacer clic en 'Mi Perfil' en la esquina inferior y ver una pantalla `/profile`."

### Artifacts
- `app/src/actions/staff.ts` (CRUD de docentes).
- `app/src/app/admin/staff/page.tsx` (Lista y modal de docentes).
- `app/src/app/profile/page.tsx` (Perfil del usuario actual logueado).

### Key Links
- `/profile` lee la sesión activa (`auth()`) para renderizar.

## Steps
1. Crear el Server Action `app/src/actions/staff.ts` copiando el estilo de los Server Actions existentes con la protección del tenant y Auth.js.
2. Añadir `getStaffList(search?: string, page?: number)` y `createStaff(data)`.
3. Construir `app/src/app/admin/staff/page.tsx` para mostrar la tabla de docentes.
4. Incluir enlace "Docentes" en el menú lateral bajo "Menú Principal" (puedes ajustar `baseMenuGroups` en los layouts que aplique, o al menos en `DashboardLayout` como prop pasable).
5. Crear `app/src/app/profile/page.tsx` (Componente asíncrono que llama a `auth()` y muestra los datos crudos del usuario: Nombre, Email, Roles).