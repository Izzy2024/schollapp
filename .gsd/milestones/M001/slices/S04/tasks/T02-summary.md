---
id: T02
parent: S04
milestone: M001
provides:
  - Componente de subida y visualización `TopicAttachments` que se ancla a un Tópico Curricular (`CurricularTopic`).
  - Interfaz gráfica en el panel del Docente para arrastrar, seleccionar y eliminar archivos (PDF, PPT, Word, etc.).
  - Restricciones base en cliente (peso máximo de 10MB) por archivo.
requires:
  - slice: S04
    provides: T01 que maneja el upload vía FormData hacia `public/uploads`.
affects: [S04]
key_files:
  - app/src/app/teacher/planning/TopicAttachments.tsx
  - app/src/app/teacher/planning/PlanningClient.tsx
key_decisions:
  - "El área de adjuntos se diseñó como un componente de bloque inyectado debajo de la descripción de cada tema, visible solo al expandir la unidad correspondiente."
  - "Los iconos de archivo cambian dinámicamente según el Content-Type detectado al subir el archivo, mejorando la distinción visual de los materiales."
patterns_established:
  - "Uso de un `<input type=\"file\" className=\"hidden\" />` operado mediante Ref en React para poder estilizar el botón de subida con un look nativo alineado al Design System."
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T02-plan.md
duration: 15min
verification_result: pass
completed_at: 2026-03-12T00:35:00Z
---

# T02: UI de Gestión de Materiales en Planificador

**Integración de la capacidad de subir material de apoyo (Archivos) para el profesorado.**

## What Happened
Se desarrolló el componente `TopicAttachments` dentro del módulo de planificación (`/teacher/planning`). Este componente permite renderizar la lista de materiales vinculados a un Tópico específico de la clase.
Se implementó la lógica en cliente para disparar la carga de archivos vía un input escondido, que despacha el archivo seleccionado usando `FormData` al Server Action `uploadAttachment`. Se establecieron límites locales lógicos (10MB) e íconos dinámicos. Finalmente, este componente se inyectó en `PlanningClient.tsx`, justo debajo de la descripción de cada tema en la lista desplegable de unidades del profesor.

## Deviations
Ninguna.

## Files Created/Modified
- `app/src/app/teacher/planning/TopicAttachments.tsx` — Creado como nuevo componente modular.
- `app/src/app/teacher/planning/PlanningClient.tsx` — Actualizado para importar y renderizar los adjuntos.