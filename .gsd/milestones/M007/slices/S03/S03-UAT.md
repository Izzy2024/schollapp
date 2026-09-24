# S03: Menús por rol: single source tipada + adopción en layouts — UAT

**Milestone:** M007
**Written:** 2026-03-27T20:35:58.929Z

## UAT — S03: Menús por rol single source

### Objetivo
Tener una única fuente de verdad para la navegación (sidebar) por rol y evitar duplicación de `menuGroups` en páginas.

### Single source
- Archivo: `app/src/lib/nav/menu.ts`
- Helper principal: `getMenuGroupsForRoles(roles)`
- Roles canónicos: `admin | director | teacher | parent | student`
- Normalización soporta aliases legacy: `docente`, `alumno`, `padre`

### Cómo agregar un item nuevo
1. Editar `MENU_BY_ROLE` en `app/src/lib/nav/menu.ts` dentro del rol correspondiente.
2. Usar un `key` estable y único por rol.
3. Verificar que `href` existe y tiene página.
4. (Si se usa badge dinámico) inyectarlo desde la página con una copia mutable del resultado.

### Checklist de smoke (por rol)
Precondición: `cd app && npx prisma db seed`

#### Admin
- Login `admin@demo.com` → redirige a `/admin`
- Sidebar renderiza grupos (General/Académico/Gestión/Finanzas/Comunicación/Sistema)
- Navegar `Calendario`, `Materias`, `Clases`, `Estudiantes` → no 404

#### Director
- Login `director@demo.com` → `/director`
- Sidebar renderiza grupos esperados
- Navegar items principales → no 404

#### Teacher
- Login `docente1@demo.com` → `/teacher`
- Sidebar renderiza items esperados
- Navegar `Mis Clases`, `Gradebook`, `Planeación` → no 404

#### Parent
- Login `padre@demo.com` → `/parent`
- Sidebar items esperados (Calendario/Finanzas/Mensajes/etc.)

#### Student
- Login `alumno@demo.com` → `/student`
- Sidebar items esperados (Asistencia/Horarios/Tareas/Reportes/...)

### Esperado
- No hay menús duplicados por página (preferir `getMenuGroupsForRoles`).
- Navegación principal por rol no produce 404.

