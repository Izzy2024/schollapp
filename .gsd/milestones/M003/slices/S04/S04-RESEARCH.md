# M003 / S04: Estabilización (lint/types/build) + suite de verificación sin mock.module — Research

**Date:** 2026-03-20

## Summary

Esta slice S04 soporta directamente **R009 (Estabilización y Tipado Estricto)** y, por dependencia, también soporta **R007 (Cobranza)** y **R001 (Multi-tenant/RBAC)** al exigir una suite de verificación confiable (sin `node:test mock.module`) que cubra contratos críticos de finanzas (scope tenant, RBAC, dedupe de cargos, aritmética de saldo) y que además deje **gates operativos** (`pnpm -C app lint/test/build`) en verde.

El codebase ya tiene el seam necesario para evitar `mock.module`: `globalThis.__TEST_SESSION__` (inyectado vía `getTestSession()` en `auth.ts`) y `globalThis.__TEST_PRISMA__` (inyectado vía `getTestPrisma()` consumido por `src/lib/prisma.ts`). De hecho, ya existen tests de finanzas y activity feed que usan este enfoque. Sin embargo, hoy **lint falla masivamente** (principalmente `no-explicit-any`, hooks lint, prefer-const, etc.) y **build falla** por un desalineamiento de tipos en `/parent/finances` (`conceptName` no existe en el DTO devuelto por `getForParent`). `pnpm -C app test` sí pasa, pero está corriendo sólo una fracción mínima de pruebas.

## Recommendation

1) **Consolidar la suite “sin mock.module”** como la suite oficial para M003: asegurar que los tests de contratos de finanzas y activity feed estén en un directorio/convención que `tsx --test` ejecute consistentemente, usando únicamente `__TEST_SESSION__`/`__TEST_PRISMA__` y evitando mocks de módulos. Esta suite debe cubrir:
   - tenant-scope derivado de sesión (no input cliente),
   - RBAC: parent sólo lectura, admin/director mutaciones,
   - dedupe/idempotencia de cargos recurrentes (unique key + upsert/transaction),
   - saldo determinista: cargos − pagos.

2) **Hacer que `lint` sea un gate real**: hoy hay ~248 errores; el patrón sugiere que se introdujeron `any` como “escape hatch” en acciones/DTOs y UI. La estrategia más eficiente será:
   - tipar explícitamente DTOs retornados por acciones (especialmente finanzas),
   - eliminar `any` en seams (`test-seams.ts`, `prisma.ts`, `auth.ts`) usando tipos utilitarios (`unknown` + narrow, `Record<string, unknown>`),
   - corregir reglas de hooks lint (`react-hooks/set-state-in-effect`, `react-hooks/rules-of-hooks`) en componentes señalados,
   - resolver `prefer-const` / `no-unescaped-entities` en páginas.

3) **Cerrar build de Next** como verificación operacional: el `next build` hoy cae en `src/app/parent/finances/page.tsx` porque la UI espera `conceptName`. Soluciones posibles (a decidir en ejecución):
   - (Preferida) extender el `select` en `getForParent()` para incluir `concept.name` y exponer `conceptName` en el DTO (o un `title` derivado), manteniendo PII mínima.
   - Alternativa: ajustar la UI para no depender de `conceptName` y mostrar “Cargo” + periodo.

## Don’t Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Evitar `mock.module` (Node 20.20.0 / tsx) | `globalThis.__TEST_SESSION__` + `getTestSession()` (`app/src/lib/test-seams.ts`, `app/src/auth.ts`) | Permite tests de acciones/contratos sin depender de mocks de módulos frágiles o no disponibles. |
| Inyección de Prisma en tests | `globalThis.__TEST_PRISMA__` + `getTestPrisma()` (`app/src/lib/test-seams.ts`, `app/src/lib/prisma.ts`) | Evita `mock.module('@/lib/prisma')` y permite simular Prisma por objeto plano de forma determinista. |
| Errores de dominio estables | `stableError` + `STABLE_ERROR` (`app/src/lib/errors.ts`, usado en acciones) | Hace que UI y tests validen códigos consistentes (RBAC/target/scope). |
| Feed de auditoría | `ActivityEvent` y acción `actions/activity.ts` | Finanzas ya emite `finance.*`; no crear otra tabla/bitácora. |

## Relevant Requirements (Active)

- **R009 Estabilización y Tipado Estricto (owner principal)**: esta slice es el gate de lanzamiento (lint/test/build en verde).
- **R007 Cobranza Básica (support)**: asegurar contratos por tests sin mocks frágiles; build debe incluir UI parent/admin de finanzas.
- **R001 Autenticación y Multi-tenant (support)**: tests deben validar tenant-scope por sesión y RBAC.
- **R006 Bitácora y Trazabilidad (support)**: tests de activity feed para eventos `finance.*`.

## Existing Code and Patterns

### Test seams (sin mock.module)

- `app/src/lib/test-seams.ts` — define `getTestSession()` y `getTestPrisma()` leyendo `globalThis.__TEST_SESSION__` / `globalThis.__TEST_PRISMA__`.
- `app/src/auth.ts` — comenta explícitamente que el seam existe porque `node:test mock.module` no está disponible; usa `getTestSession()` para bypass de NextAuth en tests.
- `app/src/lib/prisma.ts` — usa `getTestPrisma()` para retornar Prisma inyectado en tests.

### Tests existentes que ya siguen el seam

- `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts` — tests de finanzas usando `__TEST_SESSION__` y `__TEST_PRISMA__` (sin `mock.module`).
- `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts` — tests de feed de actividad con eventos `finance.*` usando seams.
- `app/src/test/routes/director-overview-activity.rbac.test.tsx` — ejemplo de RBAC/route test con seams.

### Tests legacy que aún usan mock.module (a evitar / migrar)

- `app/src/actions/__tests__/announcements.actions.test.ts`
- `app/src/actions/__tests__/attendance.*.test.ts`
- `app/src/actions/__tests__/enrollment.actions.test.ts`
- `app/src/app/**/__tests__/**.test.tsx` (varios usan `mock.module`)

### Finanzas / parent statement

- `app/src/actions/finance/statements.ts` — `getForParent()` tenant-scoped + role check y cálculo determinista (charges/payments/items/totals). Hoy el DTO de charges no incluye `conceptName`.
- `app/src/app/parent/finances/page.tsx` — UI que consume `getForParent()`. El build falla por acceso a `c.conceptName`.

## Current Operational State (evidence)

- `pnpm -C app test` **pasa**, pero ejecuta sólo 6 subtests (probablemente sólo los mjs/unit tests detectados por `tsx --test`).
- `pnpm -C app lint` **falla** con ~248 errores / 30 warnings:
  - predominan `@typescript-eslint/no-explicit-any` en acciones, tests, seams, UI,
  - varios `react-hooks/set-state-in-effect` y un `react-hooks/rules-of-hooks`,
  - `prefer-const`, `react/no-unescaped-entities`, y warnings de unused vars.
- `pnpm -C app build` **falla** por error TS en `src/app/parent/finances/page.tsx` (`conceptName` missing).

## Constraints

- **Runtime/infra de tests:** Node v20.20.0 + `tsx --test`; en este entorno `node:test mock.module` está ausente/no usable (histórico bloqueo). Por eso la suite de M003 debe basarse en seams.
- **DB:** Prisma + SQLite; dedupe/idempotencia depende de unique keys y transacciones.
- **Next build:** `next build` ejecuta chequeo TS estricto; cualquier mismatch DTO/UI rompe gate.

## Common Pitfalls

- **“Test pasa pero no corre nada”** — `tsx --test` puede no estar recogiendo archivos esperados si naming/paths no coinciden. Hay que asegurar ubicación/convención de los tests “oficiales” (y/o ajustar config) para que la suite ejecute lo crítico.
- **Reintroducir `mock.module`** — aunque algunos tests legacy lo usen, S04 debe evitar que la verificación dependa de ello; migrar o excluir esos tests del gate.
- **DTOs “a ojo” entre acciones y UI** — el error `conceptName` muestra desalineación. Tipar explícitamente los DTOs y consumirlos sin `any`.
- **Lint rules de hooks** — varios componentes hacen `setState` directo dentro de `useEffect` y un hook condicional (`useMemo`), lo que debe corregirse o aislarse para pasar lint.

## Open Risks

- **Scope real vs mocks:** si los tests de finanzas usan un prisma mock incompleto, pueden dar falso positivo sobre scoping/RBAC. Conviene tipar el prisma mock o usar un helper de “prisma stub” que falle cuando falta una query usada por la acción.
- **Workspaces / lockfiles:** `next build` advierte que detecta el root workspace por un lockfile externo (`/Users/admin/package-lock.json`). Puede no romper, pero es señal de fragilidad operativa.

## Skill Discovery

> Nota: ya hay skills instaladas relevantes (Context7, etc.). Abajo se listan skills prometedoras encontradas por `npx skills find` que podrían ayudar si el equipo decide instalarlas.

| Technology | Skill | Status |
|------------|-------|--------|
| Next.js App Router | `wshobson/agents@nextjs-app-router-patterns` | discovered (9.3K installs) |
| Prisma | `sickn33/antigravity-awesome-skills@prisma-expert` | discovered (2.8K installs) |
| Prisma | `prisma/skills@prisma-client-api` | discovered (2.4K installs) |
| node:test | none found | none |

Install commands (optional):
- `npx skills add wshobson/agents@nextjs-app-router-patterns`
- `npx skills add sickn33/antigravity-awesome-skills@prisma-expert`
- `npx skills add prisma/skills@prisma-client-api`

## Sources

- Test seams via global overrides (source: `app/src/auth.ts`, `app/src/lib/test-seams.ts`, `app/src/lib/prisma.ts`).
- Tests already using seams (source: `app/src/actions/finance/__tests__/payments-and-statement.actions.test.ts`, `app/src/actions/activity.__tests__/finance-activity-feed.actions.test.ts`, `app/src/test/routes/director-overview-activity.rbac.test.tsx`).
- Legacy tests still using `mock.module` (source: `rg "mock.module" app/src`).
- Current gate status (source: local runs of `pnpm -C app lint`, `pnpm -C app test`, `pnpm -C app build`).
