'use server';

// Client-safe boundary for enrollment UI.
// Only export async functions so Next can treat it as a server-actions module.

export async function enrollmentGetEnrollments() {
  const { getEnrollments } = await import('./enrollment-impl');
  return getEnrollments();
}

export async function enrollmentEnrollStudent(studentId: string, sectionId: string) {
  const { enrollStudent, reenrollStudent } = await import('./enrollment-impl');

  try {
    return await enrollStudent(studentId, sectionId);
  } catch (e: any) {
    const code = typeof e === 'object' && e && 'code' in e ? String(e.code) : null;
    if (code === 'ALREADY_ENROLLED_IN_YEAR') {
      // Demo-friendly: treat enroll as an upsert-style operation.
      return reenrollStudent(studentId, sectionId);
    }
    throw e;
  }
}

export async function enrollmentReenrollStudent(studentId: string, sectionId: string) {
  const { reenrollStudent } = await import('./enrollment-impl');
  return reenrollStudent(studentId, sectionId);
}
