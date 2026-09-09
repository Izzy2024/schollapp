export function extractRoles(user) {
  const rawRoles = Array.isArray(user?.roles) ? user.roles : [];
  return rawRoles.map((role) => String(role).toLowerCase());
}

export function isServerActionRequest(request) {
  return request.method === 'POST' && request.headers.has('next-action');
}

export function resolveHomePath(roles) {
  if (roles.includes('director')) return '/director';
  if (roles.includes('teacher') || roles.includes('docente')) return '/teacher';
  if (roles.includes('student') || roles.includes('alumno')) return '/student';
  if (roles.includes('parent') || roles.includes('padre')) return '/parent';
  return '/admin';
}

// NOTE: Sidebar menu single-source is implemented in TS at `src/lib/nav/menu.ts`.
// This file stays as .mjs for Edge compatibility (authorized() callback).

export function resolveFallbackPath(path, roles) {
  if (path.startsWith('/admin') && !roles.includes('admin') && !roles.includes('director')) {
    return '/teacher';
  }

  if (
    path.startsWith('/teacher') &&
    !roles.includes('teacher') &&
    !roles.includes('docente') &&
    !roles.includes('admin') &&
    !roles.includes('director')
  ) {
    return '/student';
  }

  if (path.startsWith('/director') && !roles.includes('director') && !roles.includes('admin')) {
    return '/admin';
  }

  if (
    path.startsWith('/student') &&
    !roles.includes('student') &&
    !roles.includes('alumno') &&
    !roles.includes('admin') &&
    !roles.includes('director')
  ) {
    return '/parent';
  }

  if (
    path.startsWith('/parent') &&
    !roles.includes('parent') &&
    !roles.includes('padre') &&
    !roles.includes('admin') &&
    !roles.includes('director')
  ) {
    return '/admin';
  }

  return null;
}
