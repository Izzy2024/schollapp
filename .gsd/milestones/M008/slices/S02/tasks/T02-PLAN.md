---
estimated_steps: 4
estimated_files: 4
skills_used: []
---

# T02: Soporte de datos para enrollment UI (students/sections)

- Ajustar server actions/UI para que el demo siempre pueda completar una inscripción sin caer en ALREADY_ENROLLED_IN_YEAR.
- Listar alumnos elegibles (no inscritos en año activo) como default.
- Si no hay elegibles, habilitar flujo alterno demoable: reenroll/mover sección.
- Exponer en UI botones y mensajes claros.

## Inputs

- `app/src/actions/enrollment-impl.ts`
- `app/src/actions/enrollment-ui.ts`

## Expected Output

- `Selector de alumnos muestra elegibles si existen`
- `Acción alternativa Reinscribir funciona si todos están inscritos`

## Verification

Browser: /admin/enrollment permite acción exitosa (inscribir o reinscribir) con feedback; DB refleja cambio.
