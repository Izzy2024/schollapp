# M008: 

## Vision
Convertir el flujo principal de demo (Admin crea/gestiona inscripción → alumno queda asignado a sección/clase → Teacher ve su clase → pasa asistencia) en un recorrido utilizable end-to-end, reemplazando páginas 'En construcción' relevantes por vistas mínimas operativas y evitando errores genéricos. El objetivo es demo de valor real, no completar todos los módulos.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Ruta crítica: mapa del happy path + gaps (En construcción/errores) | high | — | ✅ | Lista exacta de páginas/rutas del happy path y cuáles están operables vs placeholders; plan de cierre por orden. |
| S02 | Admin: Inscripción mínima utilizable (listado + acción) | high | S01 | ✅ | Admin completa una acción de inscripción y ve el resultado reflejado (estado/registro). |
| S03 | S03 | high | — | ✅ | Teacher entra a su clase y registra asistencia para una fecha; ve confirmación. |
| S04 | S04 | medium | — | ✅ | Recorrido completo grabable: login admin → inscripción → login teacher → asistencia, sin placeholders. E2E runner + UAT passed. |
