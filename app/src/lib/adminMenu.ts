export type AdminMenuItem = {
  key: string;
  icon: string;
  label: string;
  href: string;
};

export type AdminMenuGroup = {
  title: string;
  items: AdminMenuItem[];
};

// Centralized admin menu groups used by several admin pages.
// Keep this minimal; pages can extend/override as needed.
export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    title: 'Menú Principal',
    items: [
      { key: 'home', icon: 'home', label: 'Vista General', href: '/admin' },
      { key: 'finances', icon: 'payments', label: 'Finanzas', href: '/admin/finances' },
      { key: 'enrollment', icon: 'how_to_reg', label: 'Inscripciones', href: '/admin/enrollment' },
      { key: 'students', icon: 'people', label: 'Estudiantes', href: '/admin/students' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { key: 'academic', icon: 'calendar_month', label: 'Académico', href: '/admin/academic' },
      { key: 'settings', icon: 'settings', label: 'Ajustes', href: '/admin/settings' },
    ],
  },
];
