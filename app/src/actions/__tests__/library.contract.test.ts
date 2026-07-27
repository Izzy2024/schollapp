import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { createBook, deleteBook, checkoutBook, returnBook, getActiveLoans, getStudentLoans, getBooks } from '@/actions/library';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenantWithAdmin(slugPrefix: string) {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Library', timezone: 'America/Mexico_City' },
  });
  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
  return { tenant, admin };
}

describe('Library contract (catalog + loans) — NO mock.module', () => {
  it('full flow: create book with 1 copy, checkout makes it unavailable, return restores availability', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-lib-flow');
    const now = Date.now();

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', email: `student-${now}@ex.com`, status: 'active' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const created = await createBook({ title: 'Cien Años de Soledad', author: 'García Márquez', totalCopies: 1 });
    assert.deepEqual(created, { success: true });

    const books = await getBooks();
    assert.equal(books.length, 1);
    assert.equal(books[0].availableCopies, 1);
    const bookId = books[0].id;

    const checkout = await checkoutBook(bookId, student.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
    assert.deepEqual(checkout, { success: true });

    const afterCheckout = await getBooks();
    assert.equal(afterCheckout[0].availableCopies, 0);

    // Second checkout attempt on the same (now unavailable) copy fails.
    const secondCheckout = await checkoutBook(bookId, student.id, new Date().toISOString());
    assert.deepEqual(secondCheckout, { error: 'BOOK_NOT_AVAILABLE' });

    const activeLoans = await getActiveLoans();
    assert.equal(activeLoans.length, 1);
    assert.equal(activeLoans[0].studentName, 'Ana Pérez');
    const loanId = activeLoans[0].id;

    // Deleting a book with an active loan is rejected.
    const deleteWhileLoaned = await deleteBook(bookId);
    assert.deepEqual(deleteWhileLoaned, { error: 'BOOK_HAS_ACTIVE_LOANS' });

    const returned = await returnBook(loanId);
    assert.deepEqual(returned, { success: true });

    const afterReturn = await getBooks();
    assert.equal(afterReturn[0].availableCopies, 1);

    const doubleReturn = await returnBook(loanId);
    assert.deepEqual(doubleReturn, { error: 'LOAN_ALREADY_RETURNED' });

    clearTestSession();

    // Student can see their own loan history.
    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: [] as string[], email: student.email! });
    const studentLoans = await getStudentLoans(student.id);
    assert.equal(studentLoans.length, 1);
    assert.ok(studentLoans[0].returnedAt);
    clearTestSession();
  });

  it('rejects a non-admin/director role for catalog management', async () => {
    const { tenant } = await makeTenantWithAdmin('t-lib-role');
    const now = Date.now();
    const teacher = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(
      () => createBook({ title: 'x', totalCopies: 1 }),
      /UNAUTHORIZED_ROLE/
    );
    clearTestSession();
  });

  it('a student cannot see another student\'s loan history', async () => {
    const { tenant } = await makeTenantWithAdmin('t-lib-access');
    const now = Date.now();

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Sofía', lastName: 'Torres', status: 'active' },
    });
    const otherEmail = `other-${now}@ex.com`;

    setTestSession({ id: 'irrelevant', tenantSlug: tenant.slug, roles: [] as string[], email: otherEmail });
    await assert.rejects(() => getStudentLoans(student.id), /UNAUTHORIZED_ROLE/);
    clearTestSession();
  });
});
