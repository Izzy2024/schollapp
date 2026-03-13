# T01: Ajustes Base y Perfiles

**Slice:** S01
**Milestone:** M002

## Goal
Implementar mejoras rápidas de interfaz solicitadas:
- Incluir acceso rápido a cuentas demo en el login (botones que rellenen los campos mágicamente).
- Integrar la funcionalidad de "Cerrar Sesión" (`logOut()`) en el `DashboardLayout` para que todos los usuarios puedan salir de la app.
- Permitir inscribir docentes (asociarlos) y manejarlos en el registro, similar al flujo de estudiantes.

## Must-Haves

### Truths
- "En el formulario de `/login` hay botones directos para autocompletar el email demo (Admin, Profesor, etc.)"
- "Hacer clic en el menú del usuario en la parte inferior izquierda del dashboard despliega una opción de 'Cerrar Sesión'."
- "La plataforma permite asignar un docente a una clase sin errores."

### Artifacts
- `app/src/app/login/page.tsx`
- `app/src/components/DashboardLayout.tsx`

### Key Links
- Componente Layout hace uso del action `logOut`.

## Steps
1. Actualizar `app/src/app/login/page.tsx` para agregar los botones rápidos (esto ya se hizo en el paso previo pero lo documentamos como T01).
2. Actualizar `app/src/components/DashboardLayout.tsx` añadiendo el menú desplegable en el perfil para "Cerrar Sesión" e invocando `logOut()` (también ya inyectado en el paso anterior).
3. Escribir y probar el flujo de cerrar sesión (botón funcional).
4. Guardar y hacer commit de la Tarea 1 de M002.