# T02: Página de Login y Middleware

**Slice:** S01
**Milestone:** M001

## Goal
Crear la interfaz de inicio de sesión y configurar el middleware para proteger las rutas privadas.

## Must-Haves

### Truths
- "Un usuario no autenticado que intente acceder a `/admin`, `/teacher` o `/director` es redirigido a `/login`."
- "El formulario de login permite ingresar email y contraseña."
- "Al iniciar sesión exitosamente, se redirige al dashboard correspondiente al rol del usuario."

### Artifacts
- `app/src/middleware.ts` — Maneja la redirección.
- `app/src/app/login/page.tsx` — Interfaz de login con NextAuth signIn.
- `app/src/app/login/layout.tsx` — Layout limpio sin sidebar/dashboard components.

### Key Links
- `middleware.ts` utiliza `auth` de `app/src/auth.ts`.
- `page.tsx` (Login) llama a la server action o utiliza Auth.js signIn credentials logic.

## Steps
1. Crear `middleware.ts` en `app/src/middleware.ts`.
2. Configurar matcher para proteger `/admin`, `/director`, `/teacher`, `/student`, `/parent`.
3. Crear carpeta `app/src/app/login`.
4. Crear `page.tsx` para `/login` que use el form con Server Actions (NextAuth `signIn`).
5. (Opcional) crear un archivo de action para el login `app/src/actions/authActions.ts` para manejar el submit del lado del servidor.
6. Actualizar `.gsd/STATE.md`.
