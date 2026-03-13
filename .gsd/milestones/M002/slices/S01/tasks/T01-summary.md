---
id: T01
parent: S01
milestone: M002
provides:
  - Interfaz mejorada en `/login` con accesos rápidos para rellenar correos de usuarios demo automáticamente (Admin, Profesor, Estudiante, etc.).
  - Opción de "Cerrar Sesión" (`logOut()`) funcional e integrada en el Sidebar general (`DashboardLayout`), disponible para cualquier rol de usuario.
  - Vínculo para acceder a "Mi Perfil" en el futuro.
requires:
  - slice: S01 (M001)
    provides: "El backend de autenticación que soporta el sign-out de NextAuth."
affects: [S01]
key_files:
  - app/src/app/login/page.tsx
  - app/src/components/DashboardLayout.tsx
key_decisions:
  - "El menú de usuario de la barra lateral ahora es interactivo mediante CSS hover (`group-hover`), revelando las opciones de Perfil y Cerrar Sesión sin requerir un estado de React adicional complejo."
patterns_established:
  - "Se importó y utilizó el Server Action `logOut` directamente en un `onClick` en el Client Component `DashboardLayout`."
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-plan.md
duration: 10min
verification_result: pass
completed_at: 2026-03-12T01:00:00Z
---

# T01: Ajustes Base y Perfiles

**Mejoras rápidas en la experiencia de inicio y cierre de sesión.**

## What Happened
En respuesta a los requerimientos, se actualizaron dos piezas clave para la experiencia del usuario (UX). Primero, en la página de inicio de sesión (`/login`), se agregaron 4 botones de acceso rápido que autocompletan el formulario con las credenciales de prueba predefinidas (Admin, Director, Docente, Estudiante), facilitando el intercambio rápido de perfiles. 
Segundo, en la barra lateral global (`DashboardLayout`), se implementó un menú desplegable interactivo en la tarjeta del perfil de usuario (abajo a la izquierda) que contiene el botón "Cerrar Sesión". Este botón invoca el Server Action `logOut` que destruye la sesión segura y devuelve al usuario a la pantalla principal.

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/app/login/page.tsx` — Modificado para soportar botones demo.
- `app/src/components/DashboardLayout.tsx` — Actualizado para incluir el menú emergente (hover) con la acción de logout.