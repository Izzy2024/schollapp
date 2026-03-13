# T03: Refactorización de Multi-Tenant (Eliminar hardcodes)

**Slice:** S01
**Milestone:** M001

## Goal
Asegurar que toda la aplicación dependa de la sesión autenticada para conocer el `tenantId` o `tenantSlug`, eliminando los strings fijos `'school-demo'`.

## Must-Haves

### Truths
- "Los Server Actions usan `auth()` para obtener el tenant actual en lugar de recibirlo como parámetro hardcodeado desde el frontend o usar 'school-demo' directamente."
- "Los layouts (`app/admin/layout.tsx`, `app/teacher/layout.tsx`, etc.) pueden renderizar el usuario y tenant correctos usando la sesión activa."

### Artifacts
- Modificación en `app/src/app/admin/page.tsx` y layouts relativos.
- `app/src/components/DashboardLayout.tsx` se adapta para recibir (o leer directamente) la sesión.
- Las llamadas a `getAdminDashboardStats`, `getTeacherDashboardData`, etc. ya no inyectan string hardcodeado, sino que se saca de `session.user.tenantSlug` desde el Server Action (o se pasa del layout pero obtenido desde la auth segura).

### Key Links
- Componentes de UI (ej. `AdminDashboard`) leen la sesión de NextAuth (`await auth()`).

## Steps
1. Revisar `app/src/app/admin/page.tsx` y su equivalente en teacher/director para ver cómo inyectaban 'school-demo'.
2. Actualizarlos para que lean `auth()` y usen el `session.user.tenantSlug`.
3. Actualizar la firma de las funciones en `actions/admin.ts`, `actions/teacher.ts`, `actions/classRequests.ts`, etc., si es necesario, o pasar el parámetro que proviene de la sesión verificada en lugar del hardcodeado en el cliente. Ojo, los Server Actions deberían validar por sí mismos llamando a `auth()` para que no sea inyectable desde el frontend maliciosamente.
4. Ajustar `DashboardLayout` si requiere el nombre del usuario o rol sacados de la sesión.
5. Ejecutar TS para asegurar que no se haya roto ningún otro path.
