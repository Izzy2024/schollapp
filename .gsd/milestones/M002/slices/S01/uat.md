# S01 UAT: Ajustes UI y Docentes

**Pre-condiciones:**
1. Sistema iniciado.

**Script de Pruebas (Humano):**

1. **Botones de Demo y Login:**
   - Ve a `http://localhost:3000/login`.
   - Haz clic en los botones de "Admin", "Profesor", etc., en la parte inferior.
   - Observa cómo se rellenan automáticamente los campos de Correo y Contraseña.
   - Haz clic en Ingresar.

2. **Cerrar Sesión y Perfil:**
   - Una vez dentro, en la parte inferior izquierda de la barra gris, pasa el ratón por encima de tu inicial y nombre ("U", "Usuario Activo").
   - Haz clic en **Mi Perfil**. Te llevará a una pantalla con tus roles y detalles de ID.
   - Pasa el ratón nuevamente por tu nombre en la barra izquierda y haz clic en **Cerrar Sesión**.
   - El sistema debe llevarte de nuevo a `/login`.

3. **Inscripción de Docentes:**
   - Vuelve a iniciar sesión como Admin.
   - Ve a "Docentes / Staff" en el menú.
   - Haz clic en "Nuevo Docente".
   - Rellena "Nombre Completo" (ej. "Juan Profesor") y dale a "Guardar Docente".
   - Verás que se agrega a la lista indicando "Sin clases" asignadas. 
   - Puedes ir a "Gestión de Clases", elegir cualquier clase que no tenga profesor y, al asignarlo, "Juan Profesor" ahora aparecerá en la lista de opciones.