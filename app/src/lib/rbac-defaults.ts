export const PERMISSION_CODES = [
  'app:admin',
  'app:director',
  'app:teacher',
  'app:parent',
  'app:student',
  // Granular permissions
  'finance:write',
  'students:manage',
  'staff:manage',
  'invitations:manage',
  'grades:write',
  'attendance:write',
  'health:manage',
  'cafeteria:manage',
  'inventory:manage',
  'library:manage',
  'transport:manage',
  'conduct:manage',
  'integrations:manage',
  'schedule:manage',
  'academic:manage',
  'settings:manage',
] as const;

export const permissionCodes = PERMISSION_CODES;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export type RoleName = 'admin' | 'director' | 'teacher' | 'parent' | 'student';

export const MANAGE_PERMISSIONS: string[] = [
  'finance:write',
  'students:manage',
  'staff:manage',
  'invitations:manage',
  'grades:write',
  'attendance:write',
  'health:manage',
  'cafeteria:manage',
  'inventory:manage',
  'library:manage',
  'transport:manage',
  'conduct:manage',
  'integrations:manage',
  'schedule:manage',
  'academic:manage',
  'settings:manage',
];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  admin: ['app:admin', ...MANAGE_PERMISSIONS],
  director: ['app:director', ...MANAGE_PERMISSIONS],
  teacher: ['app:teacher', 'grades:write', 'attendance:write'],
  parent: ['app:parent'],
  student: ['app:student'],
};

export const roleDefs = [
  { name: 'admin', permissions: DEFAULT_ROLE_PERMISSIONS.admin },
  { name: 'director', permissions: DEFAULT_ROLE_PERMISSIONS.director },
  { name: 'teacher', permissions: DEFAULT_ROLE_PERMISSIONS.teacher },
  { name: 'parent', permissions: DEFAULT_ROLE_PERMISSIONS.parent },
  { name: 'student', permissions: DEFAULT_ROLE_PERMISSIONS.student },
] as const;

export const ROLE_DEFS = roleDefs;
