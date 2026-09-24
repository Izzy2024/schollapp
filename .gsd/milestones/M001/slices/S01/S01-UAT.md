# S01 UAT: RBAC y Multi-tenant Core (M001)

## Objetivo
Validar que el sistema fuerza autenticación, deriva tenant desde sesión y enruta por rol de forma consistente.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- DB seeded con usuarios demo. Nota operativa: en este repo el seed puede ejecutarse con `node app/prisma/seed.ts`.

## Usuarios demo
- Admin: `admin@demo.com`
- Director: `director@demo.com`
- Teacher: `docente1@demo.com`
- Parent: `padre@demo.com`
- Password (todos): `demo-hash-123`

## Casos de prueba

### 1) Protección de rutas (sin sesión)
1. Abrir ventana incógnito.
2. Ir a `/admin`.
3. Expected: redirige a `/login`.
4. Ir a `/teacher`.
5. Expected: redirige a `/login`.

### 2) Login Admin y tenant derivado de sesión
1. Ir a `/login`.
2. Ingresar como Admin (o usar botón demo).
3. Expected: redirige a `/admin`.
4. Navegar a `/admin/students`.
5. Expected: lista carga sin error (datos del tenant demo). No debe pedir seleccionar tenant en cliente.

### 3) Ruteo por rol (Teacher)
1. Cerrar sesión.
2. Iniciar sesión con `docente1@demo.com`.
3. Expected: redirige a `/teacher`.
4. Intentar ir manualmente a `/admin`.
5. Expected: el sistema no debe permitir operaciones fuera de rol (puede redirigir o mostrar error estable según el guard actual).

### 4) Señales de fallo
- Quedarse en `/login` con error “Credenciales incorrectas” usando credenciales demo.
- Ver datos de otro tenant (no debería ser posible con tenant derivado de sesión).

## Notas
- Si hay problemas de login “Usuario no encontrado o inactivo”, ejecutar seed (ver precondiciones).