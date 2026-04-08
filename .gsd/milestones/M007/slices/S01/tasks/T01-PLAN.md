---
estimated_steps: 4
estimated_files: 7
skills_used: []
---

# T01: Inventariar dependencias de auth y entidades mínimas requeridas

- Localizar flujo de login/auth (NextAuth o equivalente), callbacks, y queries a DB.
- Identificar qué tablas/relaciones se asumen existentes (roles, usuarios, estados).
- Definir dataset mínimo para un login exitoso por rol.
- Documentar hallazgos para orientar T03 y S02.

## Inputs

- `app/src/auth.ts`
- `app/prisma/schema.prisma`
- `app/prisma/seed.ts`
- `UAT M006 (si existe)`

## Expected Output

- `Lista de tablas/relaciones mínimas para auth`
- `Definición de usuarios/roles mínimos para seed`

## Verification

- Identificar el punto exacto donde se produce el error cuando no hay seed.
- Listar las entidades mínimas requeridas para un authorize exitoso.
