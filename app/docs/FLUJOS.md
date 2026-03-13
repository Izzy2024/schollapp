# Flujos Funcionales

## 1. Solicitud de clase

### Actor: Docente

- Pantalla: `/teacher`
- Acción: "Nueva Clase" -> `ClassRequestModal`
- Selecciona materia + sección + justificación

### Actor: Admin/Director

- Pantallas:
  - `/admin/class-requests`
  - `/director/class-requests`
- Acciones:
  - Aprobar
  - Rechazar

### Resultado

- Aprobada:
  - `ClassRequest.status = approved`
  - `SectionSubject.staffId = docente`
  - `ActivityEvent` registrado
- Rechazada:
  - `ClassRequest.status = rejected`

## 2. Solicitud de horario (nuevo)

### Actor: Docente

- Pantalla: `/teacher/classes/[sectionSubjectId]`
- Tab: `Horario`
- Botón:
  - "Solicitar Horario" (sin horario)
  - "Solicitar Cambio de Horario" (con horario)

### Payload solicitado

- tipo (`new`/`change`)
- propuesta principal (día, inicio, fin, aula opcional)
- propuesta alternativa opcional
- motivo

### Actor: Admin/Director

- Pantallas:
  - `/admin/schedule-requests`
  - `/director/schedule-requests`
- Acciones:
  - Aprobar: aplica horario en `ClassSchedule`
  - Rechazar: mantiene solicitud en `rejected`

## 3. Inscripción de estudiantes

- Pantalla: `/admin/enrollment`
- Wizard:
  - selección de alumno sin inscripción,
  - selección de sección con capacidad,
  - confirmación.

## 4. Asistencia

- Pantalla: detalle de clase docente (`/teacher/classes/[id]`)
- Tab `Alumnos`: tomar asistencia del día
- Tab `Asistencia`: historial y edición por fecha

## 5. Calificaciones y planeación

- Gradebook: `/teacher/gradebook`
- Planning: `/teacher/planning`
- Ambas operan por `sectionSubjectId` + `termId`.
