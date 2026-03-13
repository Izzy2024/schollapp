# M001: Bases Sólidas y Expedientes

## Contexto
Establecer la estructura fundamental del SaaS para educación (APPSSCHOLL). El objetivo es asegurar que la autenticación, los roles (RBAC) y la estructura de datos para alumnos, tutores y configuración académica sean sólidos. 

Adicionalmente, se requiere habilitar en el módulo de profesor (Planificador) la capacidad de subir y asociar documentos (PDF, Word, PPT).

## Constraints
- Uso de Next.js App Router
- Prisma ORM sobre SQLite (`dev.db` para desarrollo)
- Tailwind + Ant Design para UI