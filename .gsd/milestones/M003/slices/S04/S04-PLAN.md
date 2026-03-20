# S04: Estabilización (lint/types/build) + suite de verificación sin mock.module

**Goal:** Dejar el repo **lanzable** cerrando R009 con gates reales (`lint`, `test`, `build`) en verde, y consolidar una suite de verificación **sin `mock.module`** que cubra contratos críticos de finanzas (scope tenant, RBAC, dedupe, saldo) y trazabilidad (`finance.*` en Activity).
**Demo:** Ejecutar localmente y en CI: `pnpm -C app lint && pnpm -C app test && pnpm -C app build` en verde. La suite ejecuta pruebas “oficiales” (sin `mock.module`) que validan: (1) parent no puede mutar finanzas, (2) tenant-scope viene de sesión, (3) dedupe/idempotencia de cargos por `periodKey`, (4) estado de cuenta determinista (cargos − pagos), (5) eventos `finance.*` aparecen en feed con `metadata` parse-safe.

## Must-Haves

- Suite de tests “oficial” para M003 basada en seams (`__TEST_SESSION__`/`__TEST_PRISMA__`), sin `node:test mock.module`, ejecutada consistentemente por `pnpm -C app test`.
- Fix de build Next (tipos/UI) en `/parent/finances` (mismatch `conceptName` u otro DTO/UI) sin introducir `any`.
- Reducir a cero los errores de `pnpm -C app lint` (tipado, hooks rules, prefer-const, etc.) sin deshabilitar reglas globalmente.
- `pnpm -C app build` en verde (incluye chequeo TS estricto).

## Proof Level

- This slice proves: **operational** (gates reales) + **contract** (tests de contratos críticos)
- Real runtime required: **no** (aunque `next build` compila rutas reales)
- Human/UAT required: **no**

## Verification

- `pnpm -C app test` (debe ejecutar la suite de M003 sin `mock.module`, y fallar si se rompen contratos)
- `pnpm -C app lint`
- `pnpm -C app build`

Test files (creados/ajustados en esta slice; naming/ubicación se estandariza en T01):
- `app/src/actions/finance/__tests__/finance.contract.test.ts` (nuevo; sin `mock.module`): scope+RBAC+dedupe+saldo
- `app/src/actions/activity.__tests__/finance-activity.contract.test.ts` (nuevo o rename/consolidación): `finance.*` events + `metadata` parse-safe

## Observability / Diagnostics

- Runtime signals: uso de `stableError`/`STABLE_ERROR` como señal verificable para RBAC/scope; `ActivityEvent` como bitácora persistida de mutaciones `finance.*`.
- Inspection surfaces:
  - Tests contractuales (fallos indican dónde: scope/RBAC/dedupe/saldo)
  - Tabla `ActivityEvent` (via acción existente de feed en tests)
  - Build de Next (errores TS apuntan a DTO/UI mismatch)
- Failure visibility:
  - Códigos estables (ej. `STABLE_ERROR.UNAUTHORIZED`, `STABLE_ERROR.FORBIDDEN`, `STABLE_ERROR.TENANT_SCOPE` — según catálogo real)
  - Errores de Prisma/unique constraint para dedupe (capturados como stableError si aplica)
- Redaction constraints: no loggear PII; metadata de `ActivityEvent` debe ser JSON mínimo (ids + cents + periodKey).

## Integration Closure

- Upstream surfaces consumed:
  - Seams: `app/src/lib/test-seams.ts`, `app/src/auth.ts`, `app/src/lib/prisma.ts`
  - Acciones: `app/src/actions/finance/*`, `app/src/actions/activity.ts`
  - UI: `app/src/app/parent/finances/page.tsx`
- New wiring introduced in this slice:
  - Convención de ubicación/naming de tests para que `pnpm -C app test` ejecute consistentemente la suite “sin mock.module”.
  - DTO alineado entre `getForParent()` y UI para `next build`.
- What remains before the milestone is truly usable end-to-end:
  - S05: verificación manual/happy-path runtime (admin genera cargos + registra pago → parent confirma saldo + errores visibles).

## Tasks

- [x] **T01: Consolidar suite de verificación M003 sin mock.module (tests “oficiales” en rojo primero)** `est:1h`
  - Why: `pnpm -C app test` hoy pasa pero puede estar ejecutando muy poco; necesitamos una suite de contratos que corra SIEMPRE y no dependa de `mock.module`.
  - Files: `app/package.json`, `app/src/actions/finance/__tests__/finance.contract.test.ts`, `app/src/actions/activity.__tests__/finance-activity.contract.test.ts`, `app/src/lib/test-seams.ts`
  - Do: Crear/normalizar tests usando `__TEST_SESSION__`/`__TEST_PRISMA__`, asegurar naming/runner config para que `tsx --test` los incluya, y dejar al menos una aserción inicialmente fallando (red) para validar señal.
  - Verify: `pnpm -C app test` (debe ejecutar estos tests y fallar por la aserción “red” intencional)
  - Done when: Existe una suite contractual mínima ejecutada por `pnpm -C app test`, sin referencias a `mock.module`.

- [x] **T02: Arreglar build Next alineando DTO/UI de /parent/finances (sin any)** `est:45m`
  - Why: `pnpm -C app build` cae por desalineación de tipos (UI usa `conceptName` no provisto). Esto bloquea gate operacional.
  - Files: `app/src/actions/finance/statements.ts`, `app/src/app/parent/finances/page.tsx`
  - Do: Tipar explícitamente el DTO de `getForParent()` y exponer el campo requerido (preferido: incluir `concept.name` y mapear `conceptName`), o ajustar UI para no depender del campo; mantener contrato parse-safe.
  - Verify: `pnpm -C app build`
  - Done when: `next build` pasa y el contrato de statement está tipado (sin `any`).

- [x] **T03: Llevar lint a verde (tipado, hooks lint, prefer-const) sin deshabilitar reglas** `est:2h`
  - Why: R009 exige `pnpm -C app lint` como gate real; hoy hay cientos de errores.
  - Files: (lista acotada por diagnóstico real) `app/src/lib/test-seams.ts`, `app/src/lib/prisma.ts`, `app/src/auth.ts`, `app/src/app/parent/finances/page.tsx`, `app/src/actions/finance/*`, `app/src/actions/activity.ts`, y archivos puntuales reportados por ESLint
  - Do: Eliminar `any` usando `unknown`+narrow, corregir reglas de hooks donde fallen, resolver `prefer-const`/`no-unescaped-entities`/unused vars; mantener comportamiento.
  - Verify: `pnpm -C app lint` y re-correr `pnpm -C app test`
  - Done when: `pnpm -C app lint` está en verde y los tests contractuales siguen pasando.

- [x] **T04: Gate final (lint + test + build) y endurecer señal de diagnóstico en tests** `est:45m`
  - Why: Evitar “verde parcial” (lint verde pero tests no ejecutan lo crítico, o build verde pero contratos rotos).
  - Files: `app/src/actions/finance/__tests__/finance.contract.test.ts`, `app/src/actions/activity.__tests__/finance-activity.contract.test.ts`, `app/package.json`
  - Do: Quitar el “red” intencional de T01, reforzar aserciones (RBAC/scope/dedupe/saldo/metadata), y validar que los comandos exactos de gate pasan.
  - Verify: `pnpm -C app lint && pnpm -C app test && pnpm -C app build`
  - Done when: Los tres gates pasan, y los tests fallan de forma diagnóstica si se rompe scope/RBAC/dedupe/saldo o activity metadata.

## Files Likely Touched

- `app/package.json`
- `app/src/actions/finance/statements.ts`
- `app/src/app/parent/finances/page.tsx`
- `app/src/actions/finance/__tests__/finance.contract.test.ts`
- `app/src/actions/activity.__tests__/finance-activity.contract.test.ts`
- `app/src/lib/test-seams.ts`
- `app/src/lib/prisma.ts`
- `app/src/auth.ts`
