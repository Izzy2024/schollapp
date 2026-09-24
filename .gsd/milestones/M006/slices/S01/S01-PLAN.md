# S01: Inventario por rol: mapa de rutas + detección de 404/errores + priorización

**Goal:** Capturar el estado real del producto por rol y priorizar intervención: qué está OK, qué falta, qué está roto.
**Demo:** After this: Tabla por rol con rutas y estado; lista priorizada de fixes/placeholder.

## Tasks
- [x] **T01: Mapeadas rutas del menú Admin y detectadas múltiples rutas 404 presentes en navegación.** — 1) Login como admin.
2) Capturar links del menú (snapshot refs) y navegar cada href.
3) Marcar resultado: OK/404/error.
4) Guardar tabla inventario.
  - Estimate: 1-2h
  - Files: app/src/app/admin/**, .gsd/milestones/M006/**
  - Verify: N/A (inventario)
- [x] **T02: Mapeadas rutas de menú para Teacher/Parent/Student/Director y detectadas 404 masivas en Student y varias en Director/Teacher/Parent.** — 1) Login por rol.
2) Snapshot menú y navegar cada href.
3) Marcar OK/404/error.
4) Consolidar en una sola tabla con prioridad.
  - Estimate: 2-3h
  - Files: app/src/app/**, .gsd/milestones/M006/**
  - Verify: N/A
- [x] **T03: Inventario consolidado por rol (OK/404) y Top 10 prioridades guardado en S01-INVENTORY.md.** — 1) Identificar rutas 404 más críticas (en menú) y errores reales.
2) Proponer orden de fixes/placeholder para S02.
3) Guardar artifact INVENTORY.md.
  - Estimate: 1h
  - Files: .gsd/milestones/M006/slices/S01/**
  - Verify: N/A
