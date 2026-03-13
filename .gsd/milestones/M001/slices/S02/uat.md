# S02 UAT: Configuración Académica (CRUD)

**Pre-condiciones:**
1. Servidor corriendo.
2. Iniciar sesión como `admin@demo.com`.

**Script de Pruebas (Humano):**

1. **Navegación al módulo:**
   - Estando en el dashboard de Admin, usa el menú lateral para ir a Configuración -> Académico (`/admin/academic`).
   - Verifica que la pantalla cargue mostrando las tarjetas de "Ciclos Escolares", "Grados" y "Secciones (Grupos)".

2. **Crear y Activar Ciclo Escolar:**
   - Da clic en "Nuevo Ciclo".
   - Ingresa nombre "2027-2028", inicio "01/08/2027", fin "31/07/2028".
   - Da clic en "Guardar". *Debe aparecer en la lista.*
   - Da clic en "Hacer Activo" en el nuevo ciclo. *Debe cambiar su etiqueta a verde indicando que es el activo.*

3. **Crear Grado:**
   - En la sección de Grados, da clic en "Nuevo Grado".
   - Ingresa nombre "4° Secundaria", código "4S", orden "4".
   - *Debe guardarse y listarse correctamente.*

4. **Crear y Validar Sección (Grupo):**
   - En la sección de Grupos, da clic en "Nueva Sección".
   - Selecciona el ciclo recién creado.
   - Selecciona el grado recién creado.
   - Escribe el nombre "C" y capacidad "25".
   - *Debe aparecer en la tabla de secciones.*
   - Intenta borrar la sección recién creada dando clic al icono de papelera. *Debería permitirlo porque no tiene alumnos inscritos.*

5. **Protección de Datos:**
   - Observa las secciones que ya tenían alumnos inscritos (ej. 1° Primaria A). 
   - El botón de papelera debe estar semitransparente o mostrar un tooltip indicando que no se puede borrar.