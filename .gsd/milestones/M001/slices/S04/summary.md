---
id: S04
parent: M001
provides:
  - Sistema de almacenamiento base local en `public/uploads`.
  - Capacidad para que los Profesores adjunten y borren archivos de apoyo (PDF, Documentos, Presentaciones) a los Tópicos Curriculares de sus clases en el Planificador.
requires:
  - slice: S01
    provides: Sesión segura para el manejo de pertenencia de tenant.
key_files:
  - app/src/actions/attachments.ts
  - app/src/app/teacher/planning/TopicAttachments.tsx
  - app/src/app/teacher/planning/PlanningClient.tsx
key_decisions:
  - "El modelo genérico `Attachment` en BD usa polimorfismo blando (`ownerType` y `ownerId`) permitiendo extender la funcionalidad de subida a tareas, alumnos y comunicados sin tener que alterar el esquema base."
  - "Los archivos se suben al momento de la selección en el frontend en vez de subirlos al final mediante un formulario enorme. Esto le da agilidad y asincronía (AJAX-like) al profesor mientras está diseñando el plan."
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-summary.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-summary.md
completed_at: 2026-03-12T00:40:00Z
---

# S04: Planificador Docente: Archivos Adjuntos

**Culminación del M001 empoderando a los profesores para enriquecer sus clases con material de descarga.**

## What Happened
Se incorporó el soporte para manipulación de archivos. El backend fue programado con un Server Action dedicado que captura objetos binarios (`FormData File`), los escribe con una huella única (UUID) dentro de un directorio aislado por Tenant (`/public/uploads/{tenantId}`), y guarda el metadato con su URL en la base de datos `Attachment`.
En el portal del profesor, la vista de `/teacher/planning` fue expandida para embeber un nuevo componente por cada Tópico. Este componente lista dinámicamente los materiales agregados y ofrece una carga transparente en un solo click. Los archivos son visualizados con un icono acorde a su tipo, y la limpieza está garantizada: borrar el archivo desde la UI lo suprime tanto de la DB como del disco para cuidar el espacio en servidores.