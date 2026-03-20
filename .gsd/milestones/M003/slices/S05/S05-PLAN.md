# S05: Integración final “Lanzamiento” (happy path + failure visibility)

**Goal:** Demostrar que Finanzas (conceptos/cargos/pagos) + Activity Feed están **lanzables** en runtime real: flujo Admin→Parent funciona end-to-end con datos reales y los fallos relevantes se muestran con **códigos de error estables** (sin pantallas en blanco / silencios).
**Demo:** En dev local con seed reproducible: Admin crea concepto, genera cargos para un alumno en un periodo, registra un pago manual, ve eventos `finance.*` en Activity; luego Parent del mismo alumno ve en `/parent/finances` el historial y saldo correcto. Se ejecuta además un caso deliberado de fallo (o idempotencia) y el UI muestra `STABLE_ERROR.*`.

## Must-Haves

- Flujo **happy path** reproducible con datos (seed/fixture) para: tenant + admin + parent/guardian + student vinculados.
- Smoke runtime: `pnpm -C app dev` levanta y navegar rutas clave (`/admin/finances`, `/parent/finances`, Activity feed) no rompe en runtime.
- Visibilidad de fallos: UI Admin y Parent muestran error **estable** (code) en fallos esperables (RBAC/scope o validación) y no quedan estados de loading/blank.
- Observabilidad: eventos `finance.*` aparecen en Activity Feed con copy legible y metadata parse-safe (sin PII); el feed no truena si metadata es null/unknown.

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: yes (ejecución manual guiada + verificación visual)

## Verification

- `pnpm -C app lint`
- `pnpm -C app test`
- `pnpm -C app build`
- Script de smoke + procedimiento reproducible:
  - `pnpm -C app dev` y ejecutar checklist manual documentado en `S05-RUNBOOK.md` (incluye pasos, usuarios, rutas, resultados esperados y verificación de error estable en un caso de fallo/idempotencia)
- (Nuevo) Test de contrato adicional de “failure visibility” en server actions (sin browser):
  - `app/src/actions/finance/__tests__/finance.failure-visibility.contract.test.ts` (assert de `stableError.code` para un escenario determinista de scope/RBAC o input inválido)

## Observability / Diagnostics

- Runtime signals: `ActivityEvent` con acciones `finance.*`; errores tipados con `STABLE_ERROR.*` propagados a UI.
- Inspection surfaces:
  - UI: `/admin/activity` (o ruta equivalente hallada) para feed; `/admin/finances` y `/parent/finances` para finanzas.
  - DB: tablas `ActivityEvent`, `FinanceConcept`, `FinanceCharge`, `FinancePayment` (vía Prisma Studio opcional) para corroborar persistencia.
  - Logs: consola del dev server para stack traces (solo complemento, no fuente primaria).
- Failure visibility: componentes `stableErrorUi` (Admin) y card de error en Parent que incluye `Código: ...`.
- Redaction constraints: metadata de Activity sin PII (sin nombres, emails, notas libres); solo ids y montos/periodos.

## Integration Closure

- Upstream surfaces consumed: `app/src/app/admin/finances/*`, `app/src/app/parent/finances/page.tsx`, `app/src/actions/finance/*`, `app/src/actions/activity.ts`, `app/src/lib/stable-error.ts` (o equivalente), seams de test `app/src/lib/test-seams.ts`.
- New wiring introduced in this slice: seed/fixture + runbook operacional; hardening de UI para mostrar error estable en Admin; un test adicional de contrato para garantizar códigos estables.
- What remains before the milestone is truly usable end-to-end: nada (este slice es el cierre de ensamblaje; si algo falla aquí, se corrige dentro del slice).

## Tasks

- [x] **T01: Agregar verificación automatizada de “failure visibility” (códigos estables) para finanzas** `est:45m`
  - Why: Evitar que el cierre dependa sólo del manual smoke; asegurar por test que ciertos fallos producen `STABLE_ERROR.*` (no `UNKNOWN_ERROR`).
  - Files: `app/src/actions/finance/__tests__/finance.failure-visibility.contract.test.ts`, `app/src/test-runner.ts`
  - Do: Crear un test `node:test` usando seams (`__TEST_PRISMA__`, `__TEST_SESSION__`) que provoque un fallo determinista (p.ej. parent intentando acción admin, o cross-student access) y asertar `error.code` estable.
  - Verify: `pnpm -C app test` (debe fallar inicialmente hasta que T02/T03 corrijan la propagación si aplica)
  - Done when: El test existe, está registrado en el runner y pasa al final del slice.

- [x] **T02: Endurecer UI Admin finanzas para mostrar errores estables en tabs/modales (sin blanks)** `est:1h`
  - Why: S05 exige visibilidad de fallos en UI Admin; hoy puede haber rutas donde el error queda sólo en consola o se pierde el code.
  - Files: `app/src/app/admin/finances/page.tsx`, `app/src/app/admin/finances/components/ConceptsTab.tsx`, `app/src/app/admin/finances/components/ChargesTab.tsx`, `app/src/app/admin/finances/components/RecordPaymentModal.tsx`, `app/src/app/admin/finances/components/stableErrorUi.ts`
  - Do: Confirmar que cada acción async (crear concepto, generar cargos, registrar pago) captura `StableError` y renderiza `stableErrorUi` con `code` y mensaje; evitar estados de loading infinitos; agregar fallback `UNKNOWN_ERROR` visible.
  - Verify: `pnpm -C app dev` y provocar un error controlado (p.ej. enviar form inválido o simular fallo de red con devtools) y observar que el UI muestra `Código: ...`.
  - Done when: En todos los flujos admin, ante error se ve un bloque UI con `code` estable y la app sigue navegable.

- [x] **T03: Asegurar demo reproducible (seed/fixture) + runbook de lanzamiento S05 (happy path + failure case)** `est:1h`
  - Why: El mayor riesgo residual es falta de datos/usuarios para reproducir el flujo; se necesita guión único para ejecutar el smoke.
  - Files: `app/prisma/seed.ts` (o archivo seed actual), `app/README.md` (si aplica), `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md`
  - Do: Verificar/ajustar seed para incluir tenant demo con: (1) Admin/Director, (2) Parent/Guardian vinculado a un Student; documentar credenciales/forma de login (sin secretos). Escribir `S05-RUNBOOK.md` con:
    - Pre-flight (migrate/seed)
    - Pasos exactos (rutas + clicks) para: crear concepto, generar cargos, registrar pago, ver Activity.
    - Pasos Parent para ver saldo.
    - Caso de fallo: escenario determinista que muestre `STABLE_ERROR.*` (si idempotencia, capturar “0 created” o mensaje estable; si RBAC/scope, capturar código estable)
  - Verify: Ejecutar seed + `pnpm -C app dev` y seguir el runbook hasta completar; corroborar en Activity Feed y `/parent/finances`.
  - Done when: Cualquier dev puede seguir `S05-RUNBOOK.md` desde cero y reproducir el flujo con resultados esperados.

- [ ] **T04: Smoke operacional final (build + navegación) y cierre de slice (gates + evidencia)** `est:45m`
  - Why: Confirmar “lanzable” y evitar sorpresas de build/runtime en rutas de finanzas/activity.
  - Files: `.gsd/milestones/M003/slices/S05/S05-SUMMARY.md`, `.gsd/STATE.md`
  - Do: Correr gates (lint/test/build). Ejecutar dev server y navegar rutas clave con usuarios seed. Anotar evidencia mínima en `S05-SUMMARY.md` (qué se probó, qué se vio, comandos/outputs relevantes, ruta del feed).
  - Verify: `pnpm -C app lint && pnpm -C app test && pnpm -C app build`.
  - Done when: Gates en verde + summary documenta el runbook ejecutado y el resultado observado (incluye falla visible con `code`).

## Files Likely Touched

- `app/src/actions/finance/__tests__/finance.failure-visibility.contract.test.ts`
- `app/src/app/admin/finances/components/*`
- `app/prisma/seed.ts`
- `.gsd/milestones/M003/slices/S05/S05-RUNBOOK.md`
- `.gsd/milestones/M003/slices/S05/S05-SUMMARY.md`
- `.gsd/STATE.md`
