# S04 UAT: Planificador Docente: Archivos Adjuntos

**Pre-condiciones:**
1. Servidor corriendo.
2. Iniciar sesión como docente (`docente1@demo.com` con password `demo-hash-123`).
3. Estar posicionado en el Dashboard del profesor (`/teacher`).

**Script de Pruebas (Humano):**

1. **Ingreso al Planificador:**
   - Haz clic en "Planificación" en el menú lateral izquierdo.
   - Selecciona alguna materia y el periodo "Bimestre 1" (el sistema cargará las unidades base si existen).

2. **Visualizar Unidades y Tópicos:**
   - Despliega una Unidad (ej. "Números y Operaciones").
   - Bajo un Tópico (ej. "Repaso de operaciones básicas"), deberías ver una nueva barra gris que dice "Material de Apoyo".
   - Debe indicar "No hay archivos adjuntos".

3. **Adjuntar Material:**
   - Haz clic en el botón "Adjuntar archivo" (icono de clip/flecha).
   - Selecciona cualquier archivo ligero de tu PC (preferentemente un PDF, Word o imagen pequeña).
   - Observa cómo el botón cambia a estado de carga temporalmente.
   - *Aparecerá un mensaje de éxito y el archivo se listará debajo del tópico con su peso en KB y un icono correspondiente.*

4. **Visualizar el Material:**
   - Haz clic sobre el nombre del archivo recién subido en la lista.
   - *Debe abrirse en una pestaña nueva en el navegador (ej. `http://localhost:3000/uploads/tenant-uuid/filename.pdf`).*

5. **Eliminar Material:**
   - Pasa el mouse sobre el archivo en la lista; aparecerá un icono de basurero rojo a la derecha.
   - Dale clic y acepta el mensaje de confirmación.
   - *El archivo debe desaparecer de la lista instantáneamente.*