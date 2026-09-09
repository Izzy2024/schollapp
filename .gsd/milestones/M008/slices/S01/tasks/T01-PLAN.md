---
estimated_steps: 8
estimated_files: 5
skills_used: []
---

# T01: E2E discovery: navegar happy path y registrar rutas/gaps

- Asegurar seed aplicado (`prisma db seed` + seed-check).
- Login como admin.
- Identificar superficie de Inscripciones relevante (rutas: /admin/enrollment, /admin/enrollment/*).
- Ejecutar el flujo mínimo posible (crear/aprobar/asignar) o identificar el primer bloqueo.
- Logout/login como teacher.
- Navegar a Mis Clases / detalle.
- Intentar tomar asistencia.
- Registrar: rutas visitadas, qué funciona, qué está 'En construcción', y errores con causa.

## Inputs

- `Credenciales demo en app/README.md`
- `app/src/lib/nav/menu.ts`

## Expected Output

- `Mapa del flujo con URLs`
- `Lista de gaps por prioridad`
- `Recomendación del mínimo a implementar en S02/S03`

## Verification

Browser smoke + capturar logs relevantes (sin secretos).
