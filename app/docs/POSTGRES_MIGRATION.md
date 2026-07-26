# Migración de SQLite a Postgres

Runbook para cuando haya una instancia de Postgres provisionada (Railway, Supabase, Neon, etc.). El schema ya es portable — no usa tipos nativos de SQLite (`@db.*`, `Bytes`, `Json`) — así que el cambio es mecánico.

## Pendiente al momento de migrar: búsquedas case-insensitive

Los filtros `contains:` en `src/actions/search.ts` (líneas ~62-64, ~102), `src/actions/staff.ts` (líneas ~28-29) y `src/actions/students.ts` (líneas ~36-38) dependen hoy de que SQLite compare `LIKE` sin distinguir mayúsculas/minúsculas para ASCII. **Postgres sí distingue mayúsculas por defecto.** Prisma expone `mode: 'insensitive'` para resolver esto, pero **esa opción de tipo no existe mientras el provider sea `sqlite`** — no se puede añadir antes del paso 2 sin romper la compilación. Justo después de cambiar el provider (paso 2), añadir `mode: 'insensitive'` a cada uno de esos filtros y correr `npm run build` para confirmar que compilan con los tipos generados para Postgres.

## Pasos

1. **Provisionar la base de datos** (Railway/Supabase/Neon) y obtener el connection string (`postgresql://user:pass@host:port/db?sslmode=require`).

2. **Cambiar el provider en `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "postgresql"  // era "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   Acto seguido, aplicar el fix de `mode: 'insensitive'` descrito arriba y regenerar el client (`npx prisma generate`).

3. **Actualizar `DATABASE_URL`** en el `.env` de producción (o en las variables de entorno del hosting) al connection string real. **No** apuntar nunca `DATABASE_URL` de producción a `file:./dev.db`.

4. **Borrar las migraciones SQLite obsoletas** (el repo hoy usa `prisma db push`, no migraciones activas, pero `prisma/migrations/` tiene un historial viejo bloqueado a `provider = "sqlite"` en `migration_lock.toml`):
   ```bash
   rm -rf prisma/migrations
   ```

5. **Generar la migración inicial contra Postgres:**
   ```bash
   npx prisma migrate dev --name init
   ```
   A partir de aquí, usar `prisma migrate dev`/`prisma migrate deploy` en vez de `db push` para producción — así queda un historial versionado de cambios de schema.

6. **Sembrar datos** si se necesita un dataset demo:
   ```bash
   npm run db:seed
   ```

7. **Verificar:**
   ```bash
   npm run build
   npm test
   ```
   Los tests usan el mismo `DATABASE_URL` del entorno de test — confirmar que `pretest` (o el script equivalente) apunte a una base de test real y no a la de producción.

## Qué NO cambia

- Los modelos y relaciones del schema son idénticos.
- El código de acciones (`src/actions/**`) no tiene queries específicas de SQLite.
- `prisma/seed.ts` y `scripts/seed.mjs` funcionan igual contra Postgres.

## Riesgo a vigilar

- Concurrencia: SQLite serializa escrituras a nivel de archivo; Postgres permite escritura concurrente real. Si algún flujo asumía que dos requests nunca corrían en paralelo (poco probable dado que las mutaciones usan `$transaction` donde importa), no debería haber sorpresas, pero vale la pena correr una prueba de carga básica en pagos/cargos financieros tras migrar.
