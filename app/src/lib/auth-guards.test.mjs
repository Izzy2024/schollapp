import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractRoles,
  isServerActionRequest,
  resolveFallbackPath,
  resolveHomePath,
} from './auth-guards.mjs';

test('extractRoles normalizes and lowercases roles', () => {
  const roles = extractRoles({ roles: ['Admin', 'Docente'] });
  assert.deepEqual(roles, ['admin', 'docente']);
});

test('extractRoles returns empty array for missing roles', () => {
  const roles = extractRoles({});
  assert.deepEqual(roles, []);
});

test('isServerActionRequest detects Next.js server actions', () => {
  const request = {
    method: 'POST',
    headers: new Headers({ 'next-action': 'abc123' }),
  };

  assert.equal(isServerActionRequest(request), true);
});

test('isServerActionRequest ignores normal POST requests', () => {
  const request = {
    method: 'POST',
    headers: new Headers(),
  };

  assert.equal(isServerActionRequest(request), false);
});

test('resolveHomePath prioritizes role-specific dashboards', () => {
  assert.equal(resolveHomePath(['director']), '/director');
  assert.equal(resolveHomePath(['teacher']), '/teacher');
  assert.equal(resolveHomePath(['student']), '/student');
  assert.equal(resolveHomePath(['parent']), '/parent');
  assert.equal(resolveHomePath(['admin']), '/admin');
});

test('resolveFallbackPath matches route guard fallbacks', () => {
  assert.equal(resolveFallbackPath('/admin', ['student']), '/teacher');
  assert.equal(resolveFallbackPath('/teacher', ['student']), '/student');
  assert.equal(resolveFallbackPath('/director', ['teacher']), '/admin');
  assert.equal(resolveFallbackPath('/student', ['student']), null);
});
