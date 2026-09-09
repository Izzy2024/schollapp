# S02: Login sin seed: error manejado + mensaje accionable (no CallbackRouteError)

**Goal:** Evitar el patrón recurrente CallbackRouteError cuando falta seed, devolviendo un error controlado y útil para el operador/dev.
**Demo:** After this: Con DB vacía, intentar login muestra error accionable (sin crash); luego tras seed, login ok.

## Tasks
- [x] **T01: Reproducido el fallo: con DB sin seed el login muestra error genérico ('Algo salió mal') y el error real se envuelve en NextAuth (CallbackRouteError).** — - Preparar repro: simular DB vacía (mover dev.db o reset) sin correr seed.
- Intentar login y capturar error exacto (server logs + UI).
- Identificar dónde se envuelve como CallbackRouteError.
- Registrar el punto de interceptación más estable.

  - Estimate: 1-2h
  - Files: app/src/actions/authActions.ts, app/src/auth.ts, app/src/app/login/page.tsx
  - Verify: Con DB vacía, intentar login y confirmar que hoy ocurre el error (antes del fix).
- [x] **T02: Implementé manejo explícito SEED_REQUIRED en login para evitar CallbackRouteError y mostrar un mensaje accionable cuando falta seed.** — - Introducir un error estable para 'seed missing' (p.ej. class SeedRequiredError con code `SEED_REQUIRED`).
- Detectar condición seed missing:
  - Caso principal: user no existe / no hay tenant / no hay memberships.
  - Confirmar no confundir con credenciales realmente incorrectas.
- Interceptar en el lugar correcto para evitar CallbackRouteError (ideal: en `authenticate()` y/o `authorize()`).
- Mapear a un mensaje UI accionable: “Base sin datos iniciales. Ejecuta: npx prisma db seed”
- Mantener logs útiles sin exponer secretos.

  - Estimate: 2-4h
  - Files: app/src/actions/authActions.ts, app/src/auth.ts, app/src/app/login/page.tsx, app/src/lib/** (si se agrega error util)
  - Verify: DB vacía: login → mensaje accionable. Luego `npx prisma db seed` → login ok.
- [x] **T03: Actualicé UAT/runbook para cubrir el caso login sin seed con código SEED_REQUIRED y pasos de remediación.** — - Añadir/actualizar UAT con caso: login sin seed.
- Agregar nota operativa: precondición `npx prisma db seed`.
- (Opcional) añadir un pequeño check script para detectar DB vacía si ayuda a soporte.

  - Estimate: 30-60m
  - Files: .gsd/milestones/M007/slices/S02/S02-UAT.md (generado por slice complete), app/README.md (si se requiere ajuste)
  - Verify: Releer UAT y ejecutar checklist una vez.
