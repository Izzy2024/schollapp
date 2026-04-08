---
estimated_steps: 7
estimated_files: 4
skills_used: []
---

# T02: Implementar manejo SEED_REQUIRED y mensaje accionable (sin CallbackRouteError)

- Introducir un error estable para 'seed missing' (p.ej. class SeedRequiredError con code `SEED_REQUIRED`).
- Detectar condición seed missing:
  - Caso principal: user no existe / no hay tenant / no hay memberships.
  - Confirmar no confundir con credenciales realmente incorrectas.
- Interceptar en el lugar correcto para evitar CallbackRouteError (ideal: en `authenticate()` y/o `authorize()`).
- Mapear a un mensaje UI accionable: “Base sin datos iniciales. Ejecuta: npx prisma db seed”
- Mantener logs útiles sin exponer secretos.

## Inputs

- `Task T01 findings`
- `seed doc (app/README.md)`

## Expected Output

- `Login sin seed devuelve error manejado en UI`
- `No hay crash del server`
- `Código SEED_REQUIRED visible en logs`

## Verification

DB vacía: login → mensaje accionable. Luego `npx prisma db seed` → login ok.
