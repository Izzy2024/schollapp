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

  return null;
}
