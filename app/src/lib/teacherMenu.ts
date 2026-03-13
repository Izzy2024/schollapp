export const TEACHER_MENU_GROUPS = [
  {
    title: 'Consola Docente',
    items: [
      { key: '1', label: 'Vista General', icon: 'grid_view', href: '/teacher' },
      { key: '2', label: 'Planificación', icon: 'auto_stories', href: '/teacher/planning' },
      { key: '3', label: 'Libro de Calificaciones', icon: 'fact_check', href: '/teacher/gradebook' },
      { key: '4', label: 'Horario', icon: 'schedule', href: '/teacher/schedule' },
      { key: '5', label: 'Estudiantes', icon: 'people', href: '/teacher/students' },
      { key: '6', label: 'Mensajes', icon: 'chat', href: '/teacher/messages', badge: 2 },
      { key: '7', label: 'Noticias', icon: 'campaign', href: '/teacher/news' },
      { key: '8', label: 'Configuración', icon: 'settings', href: '/teacher/settings' }
    ]
  }
];
