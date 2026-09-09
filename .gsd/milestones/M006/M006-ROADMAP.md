# M006: 

## Vision
Auditar end-to-end todas las superficies por rol (Admin/Director/Teacher/Parent/Student), identificar rutas y componentes rotos (404, links mal apuntados, permisos inconsistentes) y cerrar la experiencia reemplazando 404 por páginas mínimas "En construcción" (opción A), con navegación consistente y señales de diagnóstico. No se implementan módulos completos nuevos salvo fixes pequeños necesarios para eliminar errores evidentes.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Inventario por rol: mapa de rutas + detección de 404/errores + priorización | high | — | ✅ | Tabla por rol con rutas y estado; lista priorizada de fixes/placeholder. |
| S02 | Cerrar 404 con páginas "En construcción" + arreglar links de menú/breadcrumbs | high | S01 | ✅ | Desde menús por rol ya no hay 404; si algo no existe muestra página clara de En construcción. |
| S03 | Hardening final: smoke por rol + gates + documentación UAT | medium | S02 | ✅ | Se corre checklist por rol y lint/test/build; docs UAT listas. |
