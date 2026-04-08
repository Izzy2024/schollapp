# S03: Hardening final: smoke por rol + gates + documentación UAT

**Goal:** Consolidar estabilidad y evidencia post-fixes.
**Demo:** After this: Se corre checklist por rol y lint/test/build; docs UAT listas.

## Tasks
- [x] **T01: Inventario post-fix creado: rutas de menú ahora son OK o En construcción; 404 resueltos según inventario inicial.** — 1) Re-leer `S01-INVENTORY.md`.
2) Actualizarlo para reflejar el nuevo estado: las rutas antes 404 ahora están como "En construcción" (resuelto 404).
3) Señalar cualquier ruta que siga 404 o que ahora falle por error real.
4) Guardar como `S03-INVENTORY-UPDATED.md` (no borrar el original).
  - Estimate: 1h
  - Files: .gsd/milestones/M006/slices/S01/S01-INVENTORY.md, .gsd/milestones/M006/slices/S03/**
  - Verify: rg -n "404" .gsd/milestones/M006/slices/S03/S03-INVENTORY-UPDATED.md || true
- [x] **T02: UAT M006 por rol escrito para verificar navegación sin 404 y placeholders 'En construcción'.** — 1) Crear `S03-UAT.md` con un script por rol para navegar el menú y verificar:
   - rutas OK real
   - rutas placeholder (en construcción)
   - no 404
2) Incluir precondición de seed (`node app/prisma/seed.ts`).
3) Incluir señales de fallo: 404, CallbackRouteError, rutas que crashean.
  - Estimate: 1h
  - Files: .gsd/milestones/M006/slices/S03/S03-UAT.md, .gsd/milestones/M006/slices/S03/**
  - Verify: test -f .gsd/milestones/M006/slices/S03/S03-UAT.md
- [x] **T03: Verificación final completa: gates verdes y smoke runtime confirma placeholders sin 404 en rutas representativas.** — 1) Ejecutar `pnpm -C app lint`, `pnpm -C app test`, `pnpm -C app build`.
2) Confirmar que no quedan strings 'This page could not be found.' en rutas de menú (smoke rápido en browser).
3) Completar slice S03 y luego validar/completar milestone M006.
  - Estimate: 1h
  - Files: .gsd/milestones/M006/**, app/src/**
  - Verify: pnpm -C app lint && pnpm -C app test && pnpm -C app build
