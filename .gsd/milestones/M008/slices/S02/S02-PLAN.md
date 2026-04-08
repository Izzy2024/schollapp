# S02: Admin: Inscripción mínima utilizable (listado + acción)

**Goal:** Hacer operable la parte admin del happy path: gestionar inscripciones sin placeholders.
**Demo:** After this: Admin completa una acción de inscripción y ve el resultado reflejado (estado/registro).

## Tasks
- [x] **T01: Reemplacé el placeholder de /admin/enrollment por una UI mínima operable con inscripción rápida y listado del ciclo activo.** — - Reemplazar `app/src/app/admin/enrollment/page.tsx` placeholder por UI mínima.
- Mostrar tabla de inscripciones (getEnrollments) + status.
- Agregar flujo mínimo: seleccionar student + section y ejecutar enrollStudent.
- Mostrar feedback (success/error) con códigos dominio cuando aplique.
- Evitar server-only imports en client: usar server actions como boundary.

  - Estimate: 3-5h
  - Files: app/src/app/admin/enrollment/page.tsx, app/src/actions/enrollment-impl.ts, app/src/actions/enrollment.ts, app/src/lib/nav/menu.ts
  - Verify: Browser: admin → /admin/enrollment no muestra 'En construcción'. Crear inscripción y ver que aparece en listado.
- [x] **T02: Hice el flujo de inscripción demo-friendly: alumnos elegibles por defecto y fallback a reinscripción, con boundary server-action seguro.** — - Ajustar server actions/UI para que el demo siempre pueda completar una inscripción sin caer en ALREADY_ENROLLED_IN_YEAR.
- Listar alumnos elegibles (no inscritos en año activo) como default.
- Si no hay elegibles, habilitar flujo alterno demoable: reenroll/mover sección.
- Exponer en UI botones y mensajes claros.

  - Estimate: 2-3h
  - Files: app/src/actions/enrollment-ui.ts, app/src/actions/enrollment-client.ts, app/src/actions/enrollment-impl.ts, app/src/app/admin/enrollment/EnrollmentClient.tsx
  - Verify: Browser: /admin/enrollment permite acción exitosa (inscribir o reinscribir) con feedback; DB refleja cambio.
- [x] **T03: Ajusté la UI de enrollment para evitar basura serializada de errores y dejé verificación/UAT base para el flujo admin.** — - Ejecutar seed
- Login admin
- Crear una inscripción demo
- Confirmar persistencia (query prisma) y UI
- Escribir pasos UAT para este slice

  - Estimate: 45-90m
  - Files: .gsd/milestones/M008/slices/S02/**
  - Verify: Checklist UAT ejecutable + evidencia mínima (URLs y resultado).
