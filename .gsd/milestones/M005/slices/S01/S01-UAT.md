# S01: Calendario Escolar Global (modelo + acciones + UI mínima + tests) — UAT

**Milestone:** M005
**Written:** 2026-03-26T20:52:38.951Z

# UAT: S01 Calendario Escolar Global

## Precondiciones
- App corriendo en dev.
- Base de datos con seed aplicado (nota: en este repo se puede ejecutar `node prisma/seed.ts`).
- Usuarios demo existentes: `admin@demo.com`, `docente1@demo.com`, `padre@demo.com` con password `demo-hash-123`.

## Caso 1 — Admin crea evento y lo ve
1. Ir a `/login` y entrar como Admin.
2. Navegar a `/admin/calendar`.
3. Click **Nuevo evento**.
4. Capturar título: `Día festivo`.
5. Crear.
6. **Expected:** aparece en lista de eventos del rango actual.

## Caso 2 — Teacher/Parent solo lectura
1. Iniciar sesión como Teacher (`docente1@demo.com`).
2. Ir a `/teacher/calendar`.
3. **Expected:** se ven eventos; no hay UI para crear/eliminar.
4. Iniciar sesión como Parent (`padre@demo.com`).
5. Ir a `/parent/calendar`.
6. **Expected:** se ven eventos; no hay UI para crear/eliminar.

## Caso 3 — RBAC (negativo)
1. Como Teacher/Parent intentar acceder a `createCalendarEvent` desde UI (no existe botón).
2. (Opcional) Verificar por contrato: tests `calendar.contract.test.ts`.
3. **Expected:** mutaciones prohibidas retornan `CALENDAR_FORBIDDEN`.

