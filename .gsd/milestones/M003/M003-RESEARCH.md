# M003: Finanzas, Comunicación y Lanzamiento — Research

**Date:** 2026-03-18

## Summary

M003 busca cerrar el MVP para colegios privados agregando **Cobranza (R007)** y consolidando **Comunicación (R008)**, además de **Estabilización/Tipado (R009)**. En el codebase ya existe un patrón sólido para funcionalidades “core” multi-tenant con **Prisma + tenantId**, Server Actions que derivan `tenantSlug` desde `auth()`, y trazabilidad mediante `ActivityEvent` con acciones namespaced (ej. `announcement.created|published|deleted`). Esto permite que la estrategia más segura sea: **(1) modelar Finanzas en Prisma con restricciones/índices correctos, (2) exponer Server Actions con hardening + errores estables, (3) cablear UI mínima por rol (Admin/Director/Parent) reutilizando patrones existentes, y (4) cerrar con pruebas contrato + suites lint/types**.

La comunicación vía comunicados ya está implementada y endurecida (S04), incluyendo target validation y emisión de `ActivityEvent`. Por lo tanto, en M003 conviene **reutilizar** esa base para “Lanzamiento”: visibilidad de fallos (errores estables), observabilidad (eventos), y pruebas repetibles. Para Finanzas, hoy sólo existe un “placeholder” en Parent Dashboard (`getParentDashboardData`) que simula cargos; no hay modelos ni acciones reales. El primer proof debería ser **un contrato mínimo de cobranza** que soporte (a) cargos recurrentes mensuales y (b) cargos únicos, con estado de cuenta por alumno/tutor y un flujo de registro de pago manual.

## Recommendation

1) **Probar primero el “ledger mínimo”**: definir entidades Prisma para **Conceptos/Planes de cobro, Cargos (Charges) y Pagos (Payments)** con multi-tenant estricto y claves únicas que eviten duplicados (ej. un cargo mensual por alumno+periodo). Implementar Server Actions que:
   - generen/consulten estado de cuenta (por alumno / por familia),
   - registren pagos (manuales inicialmente),
   - emitan `ActivityEvent` namespaced (`finance.charge.created`, `finance.payment.recorded`, etc.).

2) **Reusar patrones existentes**:
   - autorización/tenant: `auth()` + lookup `Tenant` por `slug` como en `app/src/actions/announcements.ts` y otros actions;
   - errores estables: `stableError` + `STABLE_ERROR` (ya usado en anuncios) y mapeo UI (ya aplicado en enrollment/attendance);
   - trazabilidad: `ActivityEvent` (ya indexado por tenant/time).

3) **Orden de slices sugerido para M003** (advisory):
   - Slice A (Finanzas backend): modelos + server actions + tests contrato
   - Slice B (Finanzas UI): estado de cuenta en `/parent/finances` + admin registro de pagos
   - Slice C (Hardening/Launch): lint/types strict, eliminar placeholders peligrosos, smoke tests runtime.

## Don’t Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Multi-tenant scoping y auth en mutaciones | Server Actions con `auth()` + lookup `Tenant` por `slug` | Evita inyección de tenant desde el cliente; patrón ya probado en varias áreas. |
| Trazabilidad / auditoría | `ActivityEvent` en Prisma (`app/prisma/schema.prisma`) | Ya está indexado por tenant/tiempo; permite diagnóstico post-lanzamiento sin infra adicional. |
| Contrato de errores de dominio | `stableError` + `STABLE_ERROR` (`app/src/lib/errors.ts`, usado en anuncios/enrollment/attendance) | Permite UI con mensajes consistentes y pruebas deterministas. |
| UI de tablas/modales | Ant Design (antd) ya adoptado | Acelera superficies CRUD (conceptos/cargos/pagos) sin introducir otra librería UI. |

## Existing Code and Patterns

- `app/prisma/schema.prisma` — Canon multi-tenant: `Tenant` y `tenantId` en modelos; `ActivityEvent` ya listo para eventos de finanzas/launch.
- `app/src/actions/announcements.ts` — Ejemplo completo de hardening: resolve tenant desde sesión, RBAC básico, validación de target, errores estables, y emisión de `ActivityEvent` con acciones namespaced.
- `app/src/actions/activity.ts` — Patrón de feed consultable para bitácora. Finanzas debería emitir eventos que puedan aparecer aquí.
- `app/src/lib/test-seams.ts` + `app/src/lib/prisma.ts` (mencionado en S05) — Seam para inyectar prisma/session en tests (evitar `mock.module` bajo `tsx --test`).
- `app/src/actions/parent.ts` — Actualmente simula “upcomingCharges”; es una superficie candidata a reemplazar por consultas reales de finanzas.
- `app/src/app/admin/announcements/page.tsx` + `app/src/app/director/announcements/page.tsx` — Patrón de reexport para evitar bifurcación de UI por rol.

## Boundary contracts that matter (candidate test contracts)

1) **Finance scope contract**: ninguna consulta/mutación puede leer o escribir cargos/pagos fuera de `tenantId` derivado de sesión.
2) **Idempotencia de cargos recurrentes**: generar cargo mensual no debe duplicar para el mismo alumno+concepto+periodo.
3) **Estado de cuenta reproducible**: suma de cargos - suma de pagos = saldo; reglas de “aplicación de pagos” deben ser deterministas (aunque sea simple al inicio).
4) **Eventos (ActivityEvent)**: cada mutación relevante emite acción namespaced con metadata mínima parse-safe.
5) **RBAC**: quién puede crear conceptos/cargos, quién puede registrar pagos, quién sólo puede ver (tutor/parent).

## Constraints

- **DB actual: SQLite** (`datasource db provider = "sqlite"`) y tenant modelado explícito. Debe cuidarse:
  - integridad con claves únicas/índices (dedupe),
  - transacciones (`prisma.$transaction`) para registrar pago + actualizar estados.
- **Auth**: NextAuth v5 beta; patrón existente depende de `auth()` y `session.user.tenantSlug`.
- **No hay integración de pasarela de pago** hoy (Stripe/MercadoPago no aparecen en dependencias). Cobranza debe arrancar como **registro manual** y/o “pending payment” sin procesamiento real.

## Common Pitfalls

- **Duplicados en cargos recurrentes** — Evitar con `@@unique([tenantId, studentId, conceptId, periodKey])` (o equivalente) y generación idempotente.
- **Modelar “mensualidad” sin periodo explícito** — Incluir un `periodKey` (ej. `2026-03`) o `dueDate` + normalización para poder reconcilio y dedupe.
- **Pagos aplicados ambiguamente** — Definir estrategia simple: pago se asocia a un cargo específico o, si es pago a cuenta, registrar `unappliedAmount` y una tabla de `PaymentAllocation`.
- **UI que oculta fallos** — Reusar contrato de errores estables y exponer mensajes visibles como en enrollment/attendance.
- **Eventos inconsistentes** — Mantener naming namespaced (`finance.*`) y metadata mínima (sin PII).

## Open Risks

- R007 puede inflarse rápidamente (becas/descuentos/recargos, prorrateos, CFDI, conciliación bancaria). Para MVP, declarar explícitamente qué queda fuera.
- Migración futura a Postgres (D001 revisable) puede requerir ajustes menores de queries/índices; diseñar period keys y uniques que sean portables.

## Requirements gaps / candidate requirements (advisory)

**Candidate requirements (consider adding):**
- **CR007a — Periodización explícita**: todo cargo recurrente debe tener un identificador de periodo (mes/año) y política de dedupe.
- **CR007b — Registro de pago manual con comprobante**: permitir adjuntar `Attachment` a un pago (reusar modelo `Attachment`) para evidencia.
- **CR007c — Roles mínimos en finanzas**: Admin/Director puede crear conceptos y registrar pagos; Parent sólo lectura.
- **CR009a — “Red flags” de lanzamiento**: suite `npm test`, `npm run lint`, y `next build` deben estar verdes como gate.

**Out of scope (explicitly):**
- Integración de pasarela (Stripe/MercadoPago), timbrado CFDI, conciliación automática, recordatorios por WhatsApp/SMS.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Prisma | `sickn33/antigravity-awesome-skills@prisma-expert` | discovered (not installed) |
| Prisma | `prisma/skills@prisma-client-api` | discovered (not installed) |
| Next.js App Router | `wshobson/agents@nextjs-app-router-patterns` | discovered (not installed) |
| Payments (Stripe, if adopted) | `wshobson/agents@stripe-integration` | discovered (not installed) |

Install commands (if you choose to add later):
- `npx skills add sickn33/antigravity-awesome-skills@prisma-expert`
- `npx skills add prisma/skills@prisma-client-api`
- `npx skills add wshobson/agents@nextjs-app-router-patterns`
- `npx skills add wshobson/agents@stripe-integration`

## Sources

- Existing multi-tenant + schema constraints + ActivityEvent availability (source: `app/prisma/schema.prisma`).
- Announcement hardening patterns: RBAC, target validation, stable errors, ActivityEvent emission (source: `app/src/actions/announcements.ts`).
- Parent finances currently mocked via upcoming charges (source: `app/src/actions/parent.ts`).
- Skill discovery outputs for Prisma/Next.js/Stripe (source: `npx skills find "Prisma"`, `npx skills find "Next.js"`, `npx skills find "Stripe"`).
