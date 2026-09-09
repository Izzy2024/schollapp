# S03 UAT: Observabilidad financiera (ActivityEvent) + auditoría (M003)

## Objetivo
Validar que mutaciones financieras emiten eventos `finance.*` en el Activity Feed con metadata parseable (sin PII).

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login Director: `director@demo.com` / `demo-hash-123` (o Admin)

## Caso 1 — Generar evento finance.charge.created
1. Login como Admin.
2. Ir a `/admin/finances`.
3. Generar cargos para un periodo.
4. Expected: se crearon cargos.

## Caso 2 — Ver activity
1. Login como Director.
2. Ir a `/director/activity`.
3. Expected: aparecen eventos recientes `finance.charge.created`.
4. Abrir un evento.
5. Expected: metadata JSON parseable (ej. contiene `chargeId`, `periodKey`, `amountCents`).

## Caso 3 — Generar evento finance.payment.recorded
1. Como Admin, registrar un pago manual en un cargo.
2. Volver a `/director/activity`.
3. Expected: aparece `finance.payment.recorded` con metadata parseable.

## Señales de fallo
- No aparecen eventos.
- Metadata no es JSON.
- Metadata contiene PII (nombres completos, emails, etc.).
