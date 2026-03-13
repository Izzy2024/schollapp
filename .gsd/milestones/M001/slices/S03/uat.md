# S03 UAT: Gestión de Expedientes (Alumnos y Tutores)

**Pre-condiciones:**
1. Servidor corriendo.
2. Iniciar sesión como `admin@demo.com`.
3. Tener al menos un Grado y un Ciclo activo (Creados en S02 o mediante Seed).

**Script de Pruebas (Humano):**

1. **Listado y Filtros de Alumnos:**
   - En el menú lateral, dirígete a `Estudiantes`.
   - Revisa que la lista contenga a los estudiantes del sistema demo (ej. Ana García, Luis Martínez).
   - Escribe "Ana" en la barra de búsqueda y verifica que el sistema filtre instantáneamente los resultados.

2. **Crear Estudiante:**
   - Haz clic en el botón negro superior derecho "Nuevo Alumno".
   - En el formulario, llena *Nombre(s)* (Ej. Pedro) y *Apellidos* (Ej. Picapiedra). 
   - Deja el campo de *Matrícula* en blanco. 
   - Da clic en "Guardar Alumno".
   - *El sistema debe recargar la lista y mostrar a Pedro Picapiedra, y el sistema le debió haber auto-generado una matrícula (ej. STD-031).*

3. **Ver Expediente:**
   - En la fila del nuevo alumno (o de cualquier otro), haz clic en el icono del "Ojo" a la derecha (Acciones).
   - *Debe llevarte a una nueva página con la información detallada.*

4. **Tutores / Familia:**
   - En el expediente, da clic en la pestaña "Tutores / Familia".
   - *Debe mostrar que no hay familiares vinculados si es un alumno nuevo.*
   - Haz clic en "Añadir Tutor".
   - Completa el nombre: "Pablo Mármol", Parentesco: "Tío", Teléfono: "555-0000". 
   - Marca la casilla "Marcar como Contacto Principal".
   - Da clic en "Vincular Tutor".
   - *El familiar debe aparecer ahora en la lista con su respectiva etiqueta "PRINCIPAL".*
   - Prueba eliminarlo dando clic en "Desvincular" y confirmando en el cuadro de diálogo.