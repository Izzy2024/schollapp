# APPSSCHOLL - Documentación Técnica y Operativa

Aplicación web escolar construida con Next.js + Prisma + SQLite para gestión de clases, docentes, estudiantes, asistencia, calificaciones, planificación e inscripciones.

## 1. Stack tecnológico

- Frontend: Next.js 16 (App Router), React 19, TypeScript
- UI: Tailwind CSS, Ant Design
- Backend (BFF): Server Actions de Next.js
- Base de datos: SQLite (`dev.db`) con Prisma ORM
- Gráficas: Chart.js + react-chartjs-2

## 2. Estructura del proyecto

- `src/app`: rutas y páginas (admin, teacher, director, student, parent)
- `src/actions`: lógica de negocio (Server Actions)
- `src/components`: componentes reutilizables
- `src/lib`: utilidades y helpers de dominio
- `prisma/schema.prisma`: modelo de datos
- `prisma/seed.ts`: seed de datos demo
- `docs/`: documentación funcional y técnica

## 3. Configuración rápida (local)

### Requisitos

- Node.js 20+
- npm

### Instalación

```bash
cd app
npm install
```

### Sincronizar base de datos

```bash
npx prisma db push
```

### Levantar proyecto

```bash
npm run dev
```

Abrir en `http://localhost:3000`.

## 4. Base de datos y tenant demo

- Tenant usado en la app: `school-demo`
- Base local: `app/dev.db`

Si cambias `schema.prisma`, siempre ejecutar:

```bash
npx prisma db push
```

## 5. Módulos funcionales

- Admin
  - Materias
  - Gestión de clases
  - Solicitudes de clase
  - Solicitudes de horario
  - Inscripciones
  - Estudiantes
- Director
  - Dashboard directivo
  - Inscripciones
  - Solicitudes de clase
  - Solicitudes de horario
- Teacher
  - Dashboard de clases
  - Detalle de clase (alumnos, asistencia, horario, calificaciones)
  - Planeación
  - Gradebook
  - Horario semanal
- Student / Parent
  - dashboards iniciales (estado demo)

## 6. Flujos clave implementados

### 6.1 Flujo de solicitud de clase

1. Docente solicita clase (`ClassRequestModal`).
2. Admin/Director revisa en `.../class-requests`.
3. Al aprobar:
   - se crea/actualiza `SectionSubject` con docente asignado,
   - se registra `ActivityEvent`,
   - se revalidan vistas.

### 6.2 Flujo de solicitud de horario (nuevo)

1. Desde detalle de clase del docente, tab `Horario`:
   - `Solicitar Horario` (si no existe)
   - `Solicitar Cambio de Horario` (si existe)
2. Admin/Director revisa en `.../schedule-requests`.
3. Al aprobar:
   - se crea o actualiza `ClassSchedule`.
4. Al rechazar:
   - se marca `rejected` con nota.

## 7. Documentación detallada

- Arquitectura: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- Flujos funcionales: [docs/FLUJOS.md](docs/FLUJOS.md)
- Cambios recientes: [docs/CAMBIOS_RECIENTES.md](docs/CAMBIOS_RECIENTES.md)

## 8. Troubleshooting

### Error al abrir detalle de clase

Si aparece error al cargar una clase:

1. Verificar que el `sectionSubjectId` exista.
2. Ejecutar `npx prisma db push`.
3. Reiniciar servidor (`npm run dev`).

### Cambié esquema Prisma y no refleja

- Ejecutar `npx prisma db push`.
- Reiniciar servidor de desarrollo.

## 9. Notas de calidad

- `npm run lint` actualmente reporta errores preexistentes del proyecto (no todos ligados a cambios recientes).
- Recomendado plan de hardening: tipado estricto en componentes y limpieza de reglas `react-hooks`/`no-explicit-any`.
