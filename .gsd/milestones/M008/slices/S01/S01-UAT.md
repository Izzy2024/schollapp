# S01: Ruta crítica: mapa del happy path + gaps (En construcción/errores) — UAT

**Milestone:** M008
**Written:** 2026-03-31T18:54:54.359Z

## UAT — S01

### Objetivo
Confirmar el estado real del happy path de demo (Admin→Teacher) y que los bloqueos quedan documentados con ruta y archivo responsable.

### Precondiciones
- Base de datos seeded.
- Usuarios de prueba (admin/teacher) existen.

### Pasos
1. Ejecutar seed y seed-check.
2. Login como admin.
3. Navegar a `/admin/enrollment`.
4. Verificar si es pantalla operativa o placeholder.
5. Logout.
6. Login como teacher.
7. Navegar a `/teacher/classes`.
8. Verificar si existe listado (o si responde 404).
9. (Opcional) Navegar a un detalle de clase si se conoce un `sectionSubjectId` real.

### Resultado esperado
- Se confirma que `/admin/enrollment` es placeholder actualmente.
- Se confirma que `/teacher/classes` no existe (404) por ausencia de `page.tsx`.
- Se documentan los archivos a modificar para resolver ambos gaps.
