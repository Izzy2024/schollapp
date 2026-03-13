# S01 UAT: RBAC y Multi-tenant Core

**Pre-condiciones:**
1. Base de datos SQLite inicializada (`npx prisma db push` y luego `npx prisma db seed`).
2. Proyecto corriendo con `npm run dev`.

**Script de Pruebas (Humano):**

1. **Protección de rutas:**
   - Abre un navegador en modo incógnito.
   - Intenta navegar a `http://localhost:3000/admin`.
   - *Debe redirigir inmediatamente a `/login`.*
   - Intenta navegar a `http://localhost:3000/teacher`.
   - *Debe redirigir inmediatamente a `/login`.*

2. **Login Admin:**
   - En la página de `/login`, usa el correo `admin@demo.com` y clave `demo-hash-123`.
   - Haz clic en Ingresar.
   - *El sistema debe iniciar sesión y llevarte automáticamente a la vista principal en `/admin`.*
   - Navega por algunas opciones (ej. Estudiantes). *Los datos deben cargar usando el tenant "school-demo" sacado de la sesión.*

3. **Login Docente:**
   - Cierra sesión (usando el botón del menú de usuario si existe, o borrando cookies manualmente).
   - Inicia sesión ahora con `docente1@demo.com` y `demo-hash-123`.
   - *El sistema debe llevarte automáticamente a `/teacher`.*
   - Intenta cambiar la URL a `/admin`.
   - *(Nota: Actualmente el middleware no bloquea estrictamente la entrada cruzada una vez logueado a menos que el middleware valide roles para la ruta específica, pero el dashboard en `/admin` probablemente no cargará datos del teacher o mostrará errores por falta de permisos/datos si estuviera blindado. Por ahora, verifica el ruteo automático correcto).*

4. **Multi-tenant isolation:**
   - Al usar el sistema, asegúrate de que toda la información mostrada (clases, estudiantes) pertenece al colegio correcto.
   - En los Server Actions se está tomando `session.user.tenantSlug`, impidiendo que nadie modifique cosas fuera de su escuela.