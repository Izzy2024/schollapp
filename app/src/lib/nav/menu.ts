export type RoleKey = 'admin' | 'director' | 'teacher' | 'parent' | 'student';

export interface NavItem {
  key: string;
  icon: string; // Material Symbols icon name
  label: string;
  href: string;
  badge?: number;
}

export interface MenuGroup {
  title: string;
  items: NavItem[];
}

const ROLE_PRIORITY: RoleKey[] = ['admin', 'director', 'teacher', 'parent', 'student'];

export function normalizeRole(role: string): RoleKey | null {
  const r = String(role).toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'director') return 'director';
  if (r === 'teacher' || r === 'docente') return 'teacher';
  if (r === 'parent' || r === 'padre' || r === 'tutor') return 'parent';
  if (r === 'student' || r === 'alumno' || r === 'estudiante') return 'student';
  return null;
}

export function getPrimaryRole(roles: Array<string | null | undefined>): RoleKey {
  const set = new Set<RoleKey>();
  for (const role of roles) {
    if (!role) continue;
    const norm = normalizeRole(role);
    if (norm) set.add(norm);
  }

  for (const r of ROLE_PRIORITY) {
    if (set.has(r)) return r;
  }

  // safe default
  return 'admin';
}

// Single source of truth for sidebar menu.
const MENU_BY_ROLE: Record<RoleKey, MenuGroup[]> = {
  admin: [
    {
      title: 'General',
      items: [
        { key: 'admin-home', icon: 'dashboard', label: 'Dashboard', href: '/admin' },
        { key: 'admin-calendar', icon: 'event', label: 'Calendario', href: '/admin/calendar' },
        { key: 'admin-announcements', icon: 'campaign', label: 'Anuncios', href: '/admin/announcements' },
      ],
    },
    {
      title: 'Académico',
      items: [
        { key: 'admin-academic', icon: 'school', label: 'Académico', href: '/admin/academic' },
        { key: 'admin-promotion', icon: 'move_up', label: 'Promoción de año', href: '/admin/academic/promotion' },
        { key: 'admin-subjects', icon: 'menu_book', label: 'Materias', href: '/admin/subjects' },
        { key: 'admin-classes', icon: 'class', label: 'Clases', href: '/admin/classes' },
        { key: 'admin-attendance', icon: 'fact_check', label: 'Asistencia', href: '/admin/attendance' },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { key: 'admin-students', icon: 'groups', label: 'Estudiantes', href: '/admin/students' },
        { key: 'admin-staff', icon: 'badge', label: 'Staff', href: '/admin/staff' },
        { key: 'admin-admissions', icon: 'assignment_ind', label: 'Admisiones', href: '/admin/admissions' },
        { key: 'admin-enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/admin/enrollment' },
        { key: 'admin-class-requests', icon: 'task', label: 'Solicitudes de clase', href: '/admin/class-requests' },
        { key: 'admin-schedule-requests', icon: 'calendar_month', label: 'Solicitudes de horario', href: '/admin/schedule-requests' },
      ],
    },
    {
      title: 'Finanzas',
      items: [{ key: 'admin-finances', icon: 'payments', label: 'Finanzas', href: '/admin/finances' }],
    },
    {
      title: 'Comunicación',
      items: [{ key: 'admin-messages', icon: 'chat', label: 'Mensajes', href: '/admin/messages' }],
    },
    {
      title: 'Sistema',
      items: [
        { key: 'admin-news', icon: 'newspaper', label: 'Noticias', href: '/admin/news' },
        { key: 'admin-settings', icon: 'settings', label: 'Configuración', href: '/admin/settings' },
        { key: 'admin-grade-weights', icon: 'grading', label: 'Ponderación de notas', href: '/admin/settings/grade-weights' },
      ],
    },
  ],

  director: [
    {
      title: 'General',
      items: [
        { key: 'director-home', icon: 'dashboard', label: 'Dashboard', href: '/director' },
        { key: 'director-calendar', icon: 'event', label: 'Calendario', href: '/director/calendar' },
        { key: 'director-news', icon: 'newspaper', label: 'Noticias', href: '/director/news' },
      ],
    },
    {
      title: 'Académico',
      items: [
        { key: 'director-academic', icon: 'school', label: 'Rendimiento', href: '/director/academic' },
        { key: 'director-attendance', icon: 'fact_check', label: 'Asistencia', href: '/director/attendance' },
        { key: 'director-staff', icon: 'badge', label: 'Desempeño Docente', href: '/director/staff' },
        { key: 'director-accreditation', icon: 'verified', label: 'Acreditación', href: '/director/accreditation' },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { key: 'director-enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/director/enrollment' },
        { key: 'director-class-requests', icon: 'task', label: 'Solicitudes de clase', href: '/director/class-requests' },
        { key: 'director-schedule-requests', icon: 'calendar_month', label: 'Solicitudes de horario', href: '/director/schedule-requests' },
        { key: 'director-resources', icon: 'inventory_2', label: 'Recursos', href: '/director/resources' },
      ],
    },
    {
      title: 'Finanzas',
      items: [{ key: 'director-financials', icon: 'payments', label: 'Finanzas', href: '/director/financials' }],
    },
  ],

  teacher: [
    {
      title: 'General',
      items: [
        { key: 'teacher-home', icon: 'dashboard', label: 'Dashboard', href: '/teacher' },
        { key: 'teacher-calendar', icon: 'event', label: 'Calendario', href: '/teacher/calendar' },
        { key: 'teacher-news', icon: 'newspaper', label: 'Noticias', href: '/teacher/news' },
      ],
    },
    {
      title: 'Clases',
      items: [
        { key: 'teacher-classes', icon: 'class', label: 'Mis Clases', href: '/teacher/classes' },
        { key: 'teacher-gradebook', icon: 'grading', label: 'Calificaciones', href: '/teacher/gradebook' },
        { key: 'teacher-assignments', icon: 'assignment', label: 'Tareas', href: '/teacher/assignments' },
        { key: 'teacher-planning', icon: 'event_note', label: 'Planeación', href: '/teacher/planning' },
        { key: 'teacher-schedule', icon: 'schedule', label: 'Horario', href: '/teacher/schedule' },
        { key: 'teacher-students', icon: 'groups', label: 'Alumnos', href: '/teacher/students' },
      ],
    },
    {
      title: 'Comunicación',
      items: [{ key: 'teacher-messages', icon: 'chat', label: 'Mensajes', href: '/teacher/messages' }],
    },
    {
      title: 'Sistema',
      items: [{ key: 'teacher-settings', icon: 'settings', label: 'Configuración', href: '/teacher/settings' }],
    },
  ],

  parent: [
    {
      title: 'Familia',
      items: [
        { key: 'parent-home', icon: 'home', label: 'Inicio', href: '/parent' },
        { key: 'parent-calendar', icon: 'event', label: 'Calendario', href: '/parent/calendar' },
        { key: 'parent-finances', icon: 'payments', label: 'Finanzas', href: '/parent/finances' },
        { key: 'parent-report-card', icon: 'grading', label: 'Boleta', href: '/parent/report-card' },
        { key: 'parent-attendance', icon: 'fact_check', label: 'Asistencia', href: '/parent/attendance' },
        { key: 'parent-messages', icon: 'chat', label: 'Mensajes', href: '/parent/messages' },
        { key: 'parent-documents', icon: 'description', label: 'Documentos', href: '/parent/documents' },
        { key: 'parent-news', icon: 'newspaper', label: 'Noticias', href: '/parent/news' },
        { key: 'parent-settings', icon: 'settings', label: 'Configuración', href: '/parent/settings' },
      ],
    },
  ],

  student: [
    {
      title: 'Alumno',
      items: [
        { key: 'student-home', icon: 'home', label: 'Inicio', href: '/student' },
        { key: 'student-attendance', icon: 'fact_check', label: 'Asistencia', href: '/student/attendance' },
        { key: 'student-schedule', icon: 'schedule', label: 'Horarios', href: '/student/schedule' },
        { key: 'student-assignments', icon: 'assignment', label: 'Tareas', href: '/student/assignments' },
        { key: 'student-reports', icon: 'insights', label: 'Reportes', href: '/student/reports' },
        { key: 'student-report-card', icon: 'grading', label: 'Boleta', href: '/student/report-card' },
        { key: 'student-messages', icon: 'chat', label: 'Mensajes', href: '/student/messages' },
        { key: 'student-news', icon: 'newspaper', label: 'Novedades', href: '/student/whats-new' },
        { key: 'student-settings', icon: 'settings', label: 'Configuración', href: '/student/settings' },
      ],
    },
  ],
};

export function getMenuGroupsForRoles(roles: Array<string | null | undefined>): MenuGroup[] {
  const primary = getPrimaryRole(roles);
  return MENU_BY_ROLE[primary];
}
