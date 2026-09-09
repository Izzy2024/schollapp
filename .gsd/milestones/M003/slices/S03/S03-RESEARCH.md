# M003 / S03 — Research: Observabilidad financiera (ActivityEvent) + superficie de auditoría

**Date:** 2026-03-20

## Summary

S03 busca cerrar R006 (bitácora/auditoría) **para finanzas** y completar el criterio del milestone: “Cada mutación financiera relevante emite `ActivityEvent` namespaced (`finance.*`) visible en el feed”. Hoy el feed existe y está normalizado/filtrado mediante `entityType` + `actionPrefix`, con parsing de metadata tolerante a fallos. Sin embargo, la taxonomía actualmente **no incluye `finance`**, y las acciones de finanzas (S01/S02) **no emiten** `ActivityEvent`.

La implementación más segura (y alineada a patrones existentes) es: (1) agregar `finance` como `ActivityEntityType` con iconografía/label, (2) emitir `ActivityEvent` en cada server action de mutación financiera (`concept.create`, `charge.generateForPeriod` por cada cargo creado, `payment.recordManual` por pago creado), con metadata mínima **parse-safe y sin PII**, y (3) asegurar que el feed muestre estos eventos filtrables por “Finanzas” tanto por `entityType='finance'` como por `action startsWith 'finance.'`.

## Recommendation

- **Reusar el patrón de anuncios**: emitir eventos con `action` namespaced (ej. `finance.charge.created`) y `metadata` JSON simple, evitando datos personales (nombres) y evitando payloads que cambien (mantener ids + centavos + periodKey + currency).
- **Preferir `entityType='finance'`** consistente para todos los eventos financieros, y usar `entityId` como el ID principal del recurso (chargeId/paymentId/conceptId). Para diferenciar sub-entidades, incluir `metadata.entity='charge'|'payment'|'concept'` o `metadata.conceptId/chargeId/paymentId`.
- **En `generateForPeriod`**: emitir evento sólo por cargos realmente creados (no por “skipped”), para mantener auditabilidad real (si se reintenta, el log no se duplica).
- **En `recordManual`**: emitir evento dentro de la misma transacción donde se crea el pago (ideal), o inmediatamente después (aceptable) pero manteniendo `tenantId` y `actorUserId` correctos.

## Don’t Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Feed de auditoría + filtros | `app/src/actions/activity.ts` + `app/src/lib/activity-taxonomy.ts` | Ya resuelve tenant-scope desde `auth()` y aplica filtros por `entityType` o `actionPrefix`.
| Metadata parse-safe | `app/src/lib/activity-metadata.ts` | Evita que un JSON inválido rompa el feed; garantiza fallback estable.
| Convención namespaced | `app/src/actions/announcements.ts` (ej. `announcement.created`) | Patrón probado en producción local; facilita consistencia y pruebas.

## Requirements Targeted (Active)

- **R006 — Bitácora (Activity Log) y Trazabilidad**: S03 lo extiende a finanzas (`finance.*`) y lo vuelve consumible en el feed.
- **R007 — Cobranza básica** (support): no agrega features nuevas de cobro, pero agrega **diagnóstico post-lanzamiento** crucial (qué cargo/pago se creó y cuándo).
- **R009 — Estabilización** (support): estandarizar metadata y taxonomía reduce fallos de UI (parsing/filters) y habilita tests en S04.

## Existing Code and Patterns

- `app/src/actions/activity.ts` — Consulta el feed por tenant y construye display (iconos/textos) en función de `entityType` normalizado + `action`.
- `app/src/lib/activity-taxonomy.ts` — Lista canónica `ACTIVITY_ENTITY_TYPES` y filtros por `actionPrefix`. **Debe ampliarse para incluir `finance`.**
- `app/src/lib/activity-metadata.ts` — `parseActivityMetadata()` soporta `object|string|null` y no revienta ante JSON inválido.
- `app/src/actions/announcements.ts` — Emite `ActivityEvent` con `action` namespaced y metadata mínima.
- `app/src/actions/finance/charges.ts` — Mutación idempotente por constraint unique (cuenta `createdCount`/`skippedCount`). **Lugar ideal para crear `finance.charge.created` por cada create exitoso.**
- `app/src/actions/finance/payments.ts` — `recordManual()` usa transacción para crear pago y recalcular estado del cargo. **Lugar ideal para crear `finance.payment.recorded`**.
- `app/prisma/schema.prisma` — Existe `ActivityEvent` con índices por `(tenantId, occurredAt)` (apto para feed). También existen modelos de finanzas (S01/S02 ya migrados).

## Constraints

- **Tenant-scope obligatorio**: el feed deriva tenant desde sesión (`auth()` + slug → Tenant.id). Por lo tanto los eventos deben escribirse con `tenantId` correcto y nunca depender de input cliente.
- **RBAC**: sólo Admin/Director puede mutar finanzas (ya existe `assertFinanceWriteAccess`), pero el feed puede ser visible según permisos existentes; S03 debe asumir visibilidad “global” dentro del tenant.
- **No PII en metadata**: el feed hoy muestra `actorUser.fullName`; evitar meter `studentName/guardianName` en metadata. Usar ids y montos.
- **Metadata debe ser JSON parseable**: `ActivityEvent.metadata` puede ser objeto/string; preferir guardar objeto simple (Prisma JSON) para evitar double-encoding.
- **Idempotencia**: no duplicar eventos cuando una mutación es idempotente (generateForPeriod reintentos).

## Common Pitfalls

- **No actualizar taxonomía** — si no se agrega `finance` a `ACTIVITY_ENTITY_TYPES`, el filtro/normalización puede degradar a defaults y el feed mostrará iconos/texto incorrectos.
- **Eventos sin `entityType` consistente** — si se usa `entityType='charge'|'payment'`, los filtros no funcionarán. Mantener `entityType='finance'` + action namespaced.
- **Metadata con PII o inestable** — nombres cambian; IDs + centavos + periodKey son estables y testeables.
- **Emitir eventos fuera de transacción** — puede existir pago sin evento si hay fallos intermedios. Preferir crear `ActivityEvent` en la misma `$transaction` de `recordManual`.

## Open Risks

- **Explosión de eventos por generación masiva**: `generateForPeriod` puede crear N cargos (uno por alumno). Emitir un evento por cargo puede ser ruidoso. Alternativa futura (no MVP): evento agregado (`finance.charge.batch_created`) con counts. Para MVP, mantener granularidad por cargo para auditoría; si es demasiado, cambiar a agregado.
- **UI del feed**: hoy el texto/iconos no contempla finanzas; hay que definir copy (“Generó un cargo”, “Registró un pago”) en `activity.ts` para mejorar legibilidad.

## Skill Discovery (suggest)

Tecnologías clave: Prisma, Next.js App Router / Server Actions.

| Technology | Skill | Status |
|------------|-------|--------|
| Prisma | `sickn33/antigravity-awesome-skills@prisma-expert` | discovered (not installed) |
| Prisma | `prisma/skills@prisma-client-api` | discovered (not installed) |
| Next.js | `wshobson/agents@nextjs-app-router-patterns` | discovered (not installed) |

Install commands (if you choose to add later):
- `npx skills add sickn33/antigravity-awesome-skills@prisma-expert`
- `npx skills add prisma/skills@prisma-client-api`
- `npx skills add wshobson/agents@nextjs-app-router-patterns`

## Sources

- Activity feed implementation, tenant-scope, metadata parsing, and taxonomy-based filtering (source: `app/src/actions/activity.ts`, `app/src/lib/activity-taxonomy.ts`, `app/src/lib/activity-metadata.ts`).
- Finance actions present but currently without `ActivityEvent` emission (source: `app/src/actions/finance/charges.ts`, `app/src/actions/finance/payments.ts`).
- Skill discovery outputs for Prisma/Next.js (source: `npx skills find "Prisma"`, `npx skills find "Next.js"`).
