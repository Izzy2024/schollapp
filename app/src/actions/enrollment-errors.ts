export type EnrollmentErrorCode =
  | 'TENANT_SCOPE_VIOLATION'
  | 'CAPACITY_EXCEEDED'
  | 'ALREADY_ENROLLED_IN_YEAR'
  | 'NO_ACTIVE_YEAR'
  | 'ENROLLMENT_NOT_FOUND';

export type EnrollmentDomainErrorShape = {
  name: 'EnrollmentDomainError';
  code: EnrollmentErrorCode;
  message: string;
};

// IMPORTANT: server-action modules are sensitive to exported classes.
// Keep the error as a plain serializable object.
export function makeEnrollmentDomainError(code: EnrollmentErrorCode, message: string): EnrollmentDomainErrorShape {
  return { name: 'EnrollmentDomainError', code, message };
}
