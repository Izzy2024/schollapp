---
id: T01
parent: S04
milestone: M001
provides:
  - Lógica backend para la subida de archivos (Server Action `uploadAttachment`) que recibe FormData y guarda archivos localmente en `/public/uploads/[tenantId]`.
  - CRUD básico atado a la tabla `Attachment` de Prisma (`getAttachments`, `deleteAttachment`).
  - Gestión automática de eliminación del archivo físico al borrar el registro en BD.
requires:
  - slice: S01
    provides: Sesión de usuario para obtener el `tenantId`.
affects: [S04]
key_files:
  - app/src/actions/attachments.ts
key_decisions:
  - "Para el alcance MVP, los archivos se guardan directamente en el sistema de archivos del servidor bajo `public/uploads` usando el `tenantId` como subcarpeta para aislamiento."
  - "El modelo de Prisma `Attachment` usa `ownerType` y `ownerId` permitiendo reutilizar la lógica de adjuntos para Tópicos, Mensajes, o Tareas en un futuro sin crear tablas nuevas."
patterns_established:
  - "Lectura del buffer y grabado con `fs/promises` dentro de un Server Action para evitar crear API Routes separados."
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-plan.md
duration: 10min
verification_result: pass
completed_at: 2026-03-12T00:25:00Z
---

# T01: API de Subida y Manejo de Adjuntos (Backend)

**Implementación del motor de archivos locales para guardar materiales didácticos.**

## What Happened
Se desarrolló el conjunto de Server Actions `uploadAttachment`, `getAttachments` y `deleteAttachment` encapsulados en `actions/attachments.ts`.
El método de subida acepta un `FormData` nativo (ideal para Next.js), lee el `File` asociado, le asigna un nombre UUID y lo guarda en la carpeta pública estructurándolo por `tenantId` para evitar cruces. Al mismo tiempo se guarda el registro de metadatos en la base de datos para facilitar listados rápidos. Al borrar, el sistema se encarga de eliminar primero la referencia y luego intenta limpiar el disco.

## Deviations
Ninguna. Se prefirió usar un solo Server Action y `fs` nativo al constatar que Next.js 14+ permite procesar arreglos binarios directamente en el backend de forma estable sin necesidad de configurar middlewares complejos en una API Route.

## Files Created/Modified
- `app/src/actions/attachments.ts` — Creado.
- `app/public/uploads` — Directorio de destino base asegurado.