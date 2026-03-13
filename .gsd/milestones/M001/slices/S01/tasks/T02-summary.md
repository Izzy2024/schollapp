---
id: T02
parent: S01
milestone: M001
provides:
  - middleware.ts configurado para proteger las rutas privadas.
  - auth.config.ts creado para uso del middleware en entornos Edge.
  - Interfaz de Login creada en app/src/app/login/page.tsx.
  - Redirección post-login automatizada hacia el dashboard correspondiente según rol (Admin, Director, Teacher, etc.).
requires:
  - slice: S01
    provides: T01 que instaló la base de NextAuth.
affects: [S01]
key_files:
  - app/src/middleware.ts
  - app/src/auth.config.ts
  - app/src/app/login/page.tsx
  - app/src/actions/authActions.ts
key_decisions:
  - "El middleware actúa como Edge runtime y requiere una configuración de Auth.js sin el driver de base de datos."
  - "El fallback a 'demo-hash-123' se mantuvo para que la DB actual de desarrollo no se rompa al implementar NextAuth."
patterns_established:
  - "Uso de Server Actions (authenticate) para login desde un Client Component usando useActionState."
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T02-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-11T23:10:00Z
---

# T02: Página de Login y Middleware

**Protección global de la plataforma con Middleware Edge de Auth.js y redirección basada en roles al iniciar sesión.**

## What Happened

Se ha configurado el archivo `middleware.ts` en la raíz de `src` para enrutarse a través del objeto `NextAuth` pero usando un `auth.config.ts` adaptado (no importa librerías dependientes de Node, sino para el edge runtime). Si un usuario no está logueado, es redirigido a `/login`. Al loguearse mediante un nuevo Server Action llamado `authenticate` desde `app/login/page.tsx`, se re-evalúa el perfil y si posee los roles asignados, el middleware intercepta la redirección natural hacia `/` mandándolo al dashboard que le corresponde (`/admin`, `/teacher`, etc.).

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/middleware.ts` — Inicialización del Edge middleware de auth.
- `app/src/auth.config.ts` — Lógica de `callbacks.authorized` para enrutar por rol.
- `app/src/actions/authActions.ts` — Server action que llama a `signIn('credentials')`.
- `app/src/app/login/page.tsx` — UI del login con Ant Design/Tailwind.
- `app/src/app/login/layout.tsx` — Layout limpio para login sin sidebar.
- `app/src/auth.ts` — Lógica modificada para validar el string literal `demo-hash-123` en el hash.