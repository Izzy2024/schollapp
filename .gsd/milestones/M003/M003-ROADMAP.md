# M003: Finanzas, Comunicación y Lanzamiento

**Vision:** Cerrar el MVP para colegios privados habilitando **cobranza básica usable** (conceptos, cargos recurrentes/únicos, registro manual de pagos y estado de cuenta) y dejar el producto **lanzable** con comunicación estable y base de código endurecida (lint/types/build/test en verde), manteniendo aislamiento multi-tenant, RBAC y trazabilidad (ActivityEvent).

## Success Criteria

- Un **Admin/Director** puede crear un **concepto de cobro** (mensual o único) y generar **cargos** para alumnos sin duplicados para el mismo periodo.
- Un **Admin/Director** puede **registrar un pago manual** (con opcional comprobante/attachment) y el **saldo** del alumno/familia se actualiza de forma determinista (cargos − pagos).
- Un **Parent/Tutor** puede ver su **estado de cuenta real** (no mock) en `/parent/finances`, con historial de cargos/pagos y saldo.
- Todas las lecturas/escrituras de finanzas son **tenant-scoped por sesión** (no por input cliente) y respetan RBAC.
- Cada mutación financiera relevante emite un `ActivityEvent` namespaced (`finance.*`) visible en el feed.
- El repo está **lanzable**: `pnpm -C app lint`, `pnpm -C app test` (suite acordada) y `pnpm -C app build` pasan; no quedan placeholders de finanzas en producción.

## Key Risks / Unknowns

- **Modelado de ledger + dedupe de recurrencia en SQLite/Prisma** — si se duplica un cargo mensual, el estado de cuenta se vuelve inconsistente y se rompe el MVP.
- **Reglas de aplicación de pagos** — si quedan ambiguas (pago “a cuenta” vs a un cargo), el saldo puede ser no determinista.
- **Infra de tests (mock.module ausente)** — ya bloqueó verificación de S02–S04; M003 debe evitar reintroducir la misma fragilidad para cerrar R009.

## Proof Strategy

- Dedupe / recurrencia → retirar en **S01** probando generación idempotente de cargos (unique key + upsert/transaction) y vista admin que no “duplica” al refrescar/reintentar.
- Estado de cuenta determinista → retirar en **S02** mostrando saldo correcto en UI Parent para un alumno con cargos/pagos reales persistidos.
- Infra de tests → retirar en **S04** migrando/añadiendo pruebas usando el seam de tests (`__TEST_PRISMA__`/`__TEST_SESSION__`) y evitando `mock.module`.

## Verification Classes

- **Contract verification:** `node:test`/React route tests usando `app/src/lib/test-seams.ts` (sin `mock.module`), validando: scope tenant, RBAC, dedupe de cargos, y aritmética saldo.
- **Integration verification:** navegación real en Next.js (admin registra cargo/pago → parent ve saldo), y feed de Activity mostrando `finance.*`.
- **Operational verification:** `pnpm -C app build` (Next build) + arranque en dev (`pnpm -C app dev`) sin errores de runtime en rutas de finanzas.
- **UAT / human verification:** revisar copy/formatos monetarios básicos y que la UI no oculte errores (muestra códigos/mensajes estables).

## Milestone Definition of Done

This milestone is complete only when all are true:

- Todas las slices S01–S05 están completas (checkboxes en [x]).
- Finanzas funciona end-to-end en UI real (Admin/Director + Parent) con datos reales persistidos.
- Las rutas nuevas están protegidas por RBAC y tenant-scope derivado de sesión.
- El Activity Feed muestra eventos `finance.*` con `metadata` parse-safe.
- `pnpm -C app lint`, `pnpm -C app test` (suite definida en S04) y `pnpm -C app build` pasan.
- Se re-chequean los **Success Criteria** contra comportamiento runtime, no solo contra tests.

## Requirement Coverage

- **Covers:** R007, R009
- **Partially covers:** R008 (comunicación: hardening/consistencia; anuncios ya existen pero se cierra con verificación + UX de fallos)
- **Leaves for later:** R010, R011 (no tocados en M003)
- **Orphan risks:** R004/R005 permanecen Active y tienen brecha histórica de verificación por `mock.module`; se mitiga en S04 agregando suites nuevas (sin reescribir toda la historia).

## Slices

- [x] **S01: Ledger mínimo (Conceptos + Cargos idempotentes) con UI Admin** `risk:high` `depends:[]`
  > After this: Un Admin/Director puede crear conceptos (mensual/único) y generar/ver cargos reales en una pantalla admin, sin duplicados por periodo al reintentar.

- [x] **S02: Registro manual de pagos + Estado de cuenta Parent (real, no mock)** `risk:high` `depends:[S01]`
  > After this: Un Admin/Director registra un pago manual y un Parent ve en `/parent/finances` el saldo e historial (cargos/pagos) calculado desde DB.

- [x] **S03: Observabilidad financiera (ActivityEvent) + superficie de auditoría** `risk:medium` `depends:[S01,S02]`
  > After this: Cada creación de cargo y registro de pago aparece en el Activity Feed como `finance.*` con metadata mínima, facilitando diagnóstico post-lanzamiento.

- [x] **S04: Estabilización (lint/types/build) + suite de verificación sin mock.module** `risk:medium` `depends:[S01,S02,S03]`
  > After this: El repo tiene una suite de tests confiable (sin `mock.module`) que cubre finanzas + un mínimo de RBAC/scope, y `lint/test/build` pasan como gate.

- [x] **S05: Slice de integración final “Lanzamiento” (happy path + failure visibility)** `risk:low` `depends:[S01,S02,S03,S04]`
  > After this: Se demuestra end-to-end en runtime real: Admin crea cargos y registra pago → Parent confirma saldo; errores estables se muestran en UI; no quedan mocks/placeholder en finanzas.

## Boundary Map

### S01 → S02

Produces:
- Prisma models para finanzas (tenant-scoped): `FinanceConcept`, `FinanceCharge` (con `periodKey` para mensual), y relaciones con `Student`/`Guardian` según patrón existente.
- Invariante de dedupe de recurrencia: `@@unique([tenantId, studentId, conceptId, periodKey])` (o equivalente) para cargos mensuales.
- Server Actions endurecidas (patrón `auth()` + resolve tenant + stableError):
  - `financeConcept.create/update/list`
  - `financeCharge.generateForPeriod` (idempotente)
  - `financeCharge.listByStudent/family`
- UI Admin mínima para conceptos + cargos (tabla + acciones principales).

Consumes:
- Auth/tenantSlug desde sesión (R001).
- Entidades existentes `Tenant`, `Student`, `Guardian`/familia (R003) y patrón de acciones (announcements/enrollment/attendance).

### S02 → S03

Produces:
- Prisma models para pagos: `FinancePayment` y (si aplica al MVP) `FinancePaymentAllocation` o estrategia simple “pago ligado a cargo”.
- Server Actions:
  - `financePayment.recordManual` (transactional)
  - `financeStatement.getForParent` (estado de cuenta: cargos, pagos, saldo)
- UI:
  - `/parent/finances` con estado de cuenta real
  - superficie Admin para registrar pago en cargo/alumno

Consumes:
- Cargos/conceptos de S01.
- Contrato de errores estables (`STABLE_ERROR`) y mapping UI.

### S03 → S04

Produces:
- Emisión de `ActivityEvent` para mutaciones financieras:
  - `finance.concept.created|updated`
  - `finance.charge.created|voided` (si existe)
  - `finance.payment.recorded`
- Metadatos JSON parse-safe (sin PII), por ejemplo: `{ conceptId, chargeId, periodKey, amountCents }`.

Consumes:
- Tabla `ActivityEvent` existente (R006).

### S04 → S05

Produces:
- Gates verdes: lint/types/build.
- Tests que prueban contratos críticos (tenant-scope, RBAC, dedupe, saldo) usando seams de test.

Consumes:
- Todas las superficies de finanzas + activity feed.

### S05 (integración final)

Produces:
- Evidencia de flujo completo en runtime real (manual): pasos reproducibles documentados dentro del slice (qué usuario, qué ruta, qué resultado visible) + capturas/notes si aplica.

Consumes:
- App corriendo en entorno local/dev con DB seeded.
