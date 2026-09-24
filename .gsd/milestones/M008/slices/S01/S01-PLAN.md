# S01: Ruta crítica: mapa del happy path + gaps (En construcción/errores)

**Goal:** Identificar exactamente qué partes del flujo Inscripción→Clase→Asistencia están rotas o en placeholder y definir el mínimo a implementar.
**Demo:** After this: Lista exacta de páginas/rutas del happy path y cuáles están operables vs placeholders; plan de cierre por orden.

## Tasks
- [x] **T01: Mapeé el happy path demo y encontré los primeros bloqueos: /admin/enrollment está en construcción y /teacher/classes da 404.** — - Asegurar seed aplicado (`prisma db seed` + seed-check).
- Login como admin.
- Identificar superficie de Inscripciones relevante (rutas: /admin/enrollment, /admin/enrollment/*).
- Ejecutar el flujo mínimo posible (crear/aprobar/asignar) o identificar el primer bloqueo.
- Logout/login como teacher.
- Navegar a Mis Clases / detalle.
- Intentar tomar asistencia.
- Registrar: rutas visitadas, qué funciona, qué está 'En construcción', y errores con causa.

  - Estimate: 1-2h
  - Files: app/src/app/admin/**, app/src/app/teacher/**, app/src/actions/enrollment-impl.ts, app/src/actions/enrollment.ts, app/src/actions/attendance.ts
  - Verify: Browser smoke + capturar logs relevantes (sin secretos).
- [x] **T02: Mapeé los gaps del happy path a archivos concretos: /admin/enrollment es placeholder intencional y /teacher/classes falta page.tsx; el dominio de enrollment ya existe.** — - Para cada gap de T01, localizar el archivo exacto (page.tsx/client/action).
- Confirmar si es placeholder (En construcción) o error real.
- Identificar dependencias de datos (modelos) para arreglar rápido.
- Entregar tabla gap→ruta→archivo→tipo de fix.

  - Estimate: 45-90m
  - Files: app/src/app/admin/enrollment/**, app/src/app/teacher/classes/**, app/src/actions/enrollment-impl.ts, app/src/actions/enrollment.ts, app/src/actions/teacher.ts, app/src/actions/attendance.ts
  - Verify: `rg` + lectura puntual de archivos encontrados; confirmar que el gap se explica por el código localizado.
