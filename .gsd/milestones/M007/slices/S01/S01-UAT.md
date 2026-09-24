# S01: Seed estándar: prisma db seed + dataset mínimo para auth — UAT

**Milestone:** M007
**Written:** 2026-03-27T20:01:23.906Z

## UAT — S01: Seed estándar

### Objetivo
Asegurar que un entorno limpio puede inicializarse con un comando estándar (`prisma db seed`) y que existen usuarios/roles mínimos para login.

### Pasos
1. (Opcional) Reset DB si aplica.
2. `cd app`
3. `npx prisma db push`
4. `npx prisma db seed`
5. Abrir `/login`
6. Probar login con credenciales demo (ver `app/README.md`).

### Esperado
- Seed corre sin error.
- Seed es idempotente (re-ejecutar no rompe ni duplica entidades clave).
- Existen roles canónicos en DB: admin/director/teacher/parent/student.
- Login es posible con usuario demo.
