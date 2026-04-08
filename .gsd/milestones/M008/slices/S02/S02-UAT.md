# S02: Admin: Inscripción mínima utilizable — UAT

**Milestone:** M008
**Written:** 2026-03-31T20:59:11.067Z

## UAT: Admin Inscripciones (S02)

Precondición: base seedeada (`cd app && node --import tsx scripts/seed.mjs` y `seed-check`).

1) Login como admin
- Ir a `/login`
- Credenciales: `admin@demo.com` / `demo-hash-123`
- Esperado: redirige a `/admin`

2) Abrir Inscripciones
- Navegar a `/admin/enrollment`
- Esperado:
  - Título “Inscripciones”
  - Sección “Inscripción rápida” con select de Alumno y Sección
  - Tabla “Inscripciones (ciclo activo)” con filas
  - Si seed ya inscribió a todos: banner “Modo demo…” visible

3) Reasignar un alumno (demo)
- Elegir un Alumno en el select
- Cambiar Sección a otra
- Click “Inscribir”
- Click “Recargar”
- Esperado:
  - La página no muestra error genérico
  - La acción no produce 500s por `ALREADY_ENROLLED_IN_YEAR`
  - El listado se mantiene cargando correctamente tras recargar

4) Verificación técnica
- `cd app && npm test` debe pasar
- `cd app && npm run build` debe pasar

