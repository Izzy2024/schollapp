# S05 UAT: Bitácora Global y Dashboard (Overview) (M002)

## Objetivo
Validar que existe activity feed global y que el dashboard Overview muestra métricas coherentes con datos reales.

## Precondiciones
- App corriendo: `pnpm -C app dev`
- Seed aplicado: `node app/prisma/seed.ts`
- Login como Director: `director@demo.com` / `demo-hash-123`

## Caso 1 — Overview carga
1. Ir a `/login` e ingresar como Director.
2. Expected: redirige a `/director/overview` (o entrar manualmente).
3. Expected: se muestran KPIs (matrícula, asistencia hoy, pendientes) sin errores.

## Caso 2 — Activity feed
1. Navegar a `/director/activity`.
2. Expected: se ve una lista de eventos (activity feed) ordenada por fecha.
3. (Opcional) Generar un evento:
   - Crear un comunicado o registrar un pago y volver al feed.
4. Expected: aparece un evento nuevo (`announcement.*`, `finance.*`, `communication.*` según módulos usados).

## Señales de fallo
- El feed aparece vacío con seed aplicado.
- Eventos muestran metadata no parseable.
- KPIs no coinciden con acciones (ej. asistencia tomada pero KPI no cambia).
