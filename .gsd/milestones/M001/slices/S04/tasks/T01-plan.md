# T01: API de Subida y Manejo de Adjuntos (Backend)

**Slice:** S04
**Milestone:** M001

## Goal
Construir el backend que permita recibir archivos, guardarlos en el file system (para el MVP local) y registrar los metadatos en la tabla `Attachment` de Prisma asociados a un `ownerId` (que será el Tópico) y un `ownerType` ('topic').

## Must-Haves

### Truths
- "Existe un Server Action o Route Handler que recibe un `FormData` con un archivo."
- "El archivo se guarda en `/public/uploads` o similar (dentro de `app/public`)."
- "Se crea un registro en Prisma `Attachment` con la URL del archivo y los metadatos."
- "Existe una función para eliminar el archivo del disco y borrar su registro de DB."
- "Existe una función para obtener los archivos atados a un Tópico específico."

### Artifacts
- `app/src/actions/attachments.ts` — Server Actions para upload y borrado.

### Key Links
- Asegurarse de usar `const session = await auth(); tenantSlug = session.user.tenantSlug;`.

## Steps
1. Crear carpeta `app/public/uploads` si no existe. (Por si Next la ignora, el action la crea dinámicamente).
2. Crear archivo `app/src/actions/attachments.ts`.
3. Implementar `uploadAttachment(formData: FormData, ownerType: string, ownerId: string)`.
   - Extraer el archivo.
   - Generar nombre único (UUID).
   - Escribir archivo usando `fs` de Node.js a `public/uploads`.
   - Insertar registro en DB.
4. Implementar `deleteAttachment(attachmentId: string)`.
5. Implementar `getAttachments(ownerType: string, ownerId: string)`.
6. Actualizar `.gsd/STATE.md`.