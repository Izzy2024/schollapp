# T02: UI de Gestión de Materiales en Planificador

**Slice:** S04
**Milestone:** M001

## Goal
Integrar la subida y listado de archivos en la interfaz de usuario del profesor (Planificador).

## Must-Haves

### Truths
- "En el Planificador Docente (`/teacher/planning`), cada Tópico muestra un botón o área para subir material de apoyo."
- "El profesor puede seleccionar un archivo (PDF, PPT, Word) y al subirlo se refleja en la lista de ese Tópico."
- "Los alumnos o profesores pueden dar clic en el archivo adjunto para abrirlo/descargarlo."
- "El profesor puede eliminar un adjunto que haya subido equivocadamente."

### Artifacts
- `app/src/app/teacher/planning/PlanningClient.tsx` — Actualizado con la interfaz de carga de archivos (FileInput o similar) y lista de adjuntos por `Topic`.
- Posiblemente un nuevo componente local `TopicAttachments.tsx` para no saturar el archivo principal.

### Key Links
- La interfaz llamará a `uploadAttachment`, `getAttachments` y `deleteAttachment` definidos en S04/T01.

## Steps
1. Revisar `app/src/app/teacher/planning/PlanningClient.tsx` para entender la estructura de Tópicos.
2. Crear un componente hijo `TopicAttachments` que reciba el `topicId`.
3. Este componente debe usar `useEffect` para llamar a `getAttachments('topic', topicId)`.
4. Mostrar la lista de archivos con iconos y botón "Eliminar".
5. Incluir un input `<input type="file" />` que al cambiar de valor ejecute la subida mediante un `FormData`.
6. Al terminar la subida, recargar la lista local de attachments.
7. Insertar el componente `TopicAttachments` debajo o a un lado de la descripción de cada tópico en el `PlanningClient.tsx`.
8. Probar la compilación y actualizar el `.gsd/STATE.md`.