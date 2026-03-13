# S04: Planificador Docente: Archivos Adjuntos

**Goal:** Permitir a los profesores subir, visualizar y eliminar archivos de apoyo (PDF, PPT, Word) vinculados a sus clases (Tópicos Curriculares) dentro del Planificador Docente.
**Demo:** Un docente entra a su Planificador, expande un "Tópico" y hace clic en "Adjuntar material". Sube un archivo PDF. Al recargar la página, el PDF sigue ahí y puede ser descargado por él (y posteriormente por sus estudiantes).

## Must-Haves
- Backend para recibir archivos (`FormData` o API Route) y guardarlos en el disco local temporalmente (MVP) o mediante BLOBs, creando un registro en la tabla `Attachment` de Prisma.
- UI en `/teacher/planning` o dentro del modal de edición de Tópico para arrastrar/soltar o seleccionar un archivo.
- Visualización de la lista de adjuntos por cada Tópico en la UI del planificador.
- Botón de eliminación de archivo adjunto (que elimine el registro de BD y el archivo físico).

## Tasks

- [ ] **T01: API de Subida y Manejo de Adjuntos (Backend)**
  Crear Server Actions o API Routes para manejar subida, listado y borrado de archivos atados al modelo `Attachment` de Prisma. Configurar carpeta `/public/uploads` o similar para MVP.

- [ ] **T02: UI de Gestión de Materiales en Planificador**
  Actualizar `app/src/app/teacher/planning/PlanningClient.tsx` o modales relacionados para mostrar los archivos vinculados a un `CurricularTopic` y permitir subirlos/borrarlos usando el backend de T01.

## Files Likely Touched
- `app/src/actions/attachments.ts` (Nuevo)
- `app/src/app/api/upload/route.ts` (Nuevo, si Server Action tiene límite de tamaño o es complejo para files)
- `app/src/app/teacher/planning/PlanningClient.tsx`
- `app/src/actions/planning.ts`