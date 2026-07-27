'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';

// ponytail: revalidatePath needs a Next.js request context; contract tests run
// this action outside one, so failures here are swallowed (cache staleness, not correctness).
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

type Session = {
  id: string;
  email?: string | null;
  tenantSlug?: string | null;
  roles?: string[] | null;
};

async function getTenant(session: Session) {
  if (!session.tenantSlug) throw new Error('Tenant not found');
  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
}

function isAdminOrDirector(session: Session): boolean {
  const roles = session.roles ?? [];
  return roles.includes('admin') || roles.includes('director');
}

async function assertLibrarian(session: Session) {
  if (!isAdminOrDirector(session)) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

/** Admin/director can see any student's loans; a student can see their own; a guardian can see their linked children's. */
async function assertLoanAccess(tenantId: string, studentId: string, session: Session): Promise<void> {
  if (isAdminOrDirector(session)) return;

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (student?.email && student.email === session.email) return;

  const guardian = session.email ? await prisma.guardian.findFirst({ where: { tenantId, email: session.email } }) : null;
  if (guardian) {
    const link = await prisma.studentGuardian.findUnique({
      where: { tenantId_studentId_guardianId: { tenantId, studentId, guardianId: guardian.id } },
    });
    if (link) return;
  }

  throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

export type BookRow = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  totalCopies: number;
  availableCopies: number;
};

export async function getBooks(search?: string): Promise<BookRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);

  const books = await prisma.book.findMany({
    where: {
      tenantId: tenant.id,
      ...(search ? { OR: [{ title: { contains: search } }, { author: { contains: search } }] } : {}),
    },
    orderBy: { title: 'asc' },
  });

  return books;
}

export async function createBook(data: {
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  totalCopies: number;
}): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertLibrarian(session.user);
  const tenant = await getTenant(session.user);

  if (!data.title.trim() || data.totalCopies < 1) {
    return { error: STABLE_ERROR.INVALID_TARGET };
  }

  await prisma.book.create({
    data: {
      tenantId: tenant.id,
      title: data.title.trim(),
      author: data.author,
      isbn: data.isbn,
      category: data.category,
      totalCopies: data.totalCopies,
      availableCopies: data.totalCopies,
    },
  });

  safeRevalidate('/admin/library');
  return { success: true };
}

export async function deleteBook(bookId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertLibrarian(session.user);
  const tenant = await getTenant(session.user);

  const book = await prisma.book.findFirst({ where: { id: bookId, tenantId: tenant.id } });
  if (!book) return { error: STABLE_ERROR.BOOK_NOT_FOUND };

  const activeLoans = await prisma.bookLoan.count({ where: { tenantId: tenant.id, bookId, returnedAt: null } });
  if (activeLoans > 0) return { error: STABLE_ERROR.BOOK_HAS_ACTIVE_LOANS };

  await prisma.book.delete({ where: { id: bookId } });
  safeRevalidate('/admin/library');
  return { success: true };
}

export type LoanRow = {
  id: string;
  bookTitle: string;
  studentName: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  isOverdue: boolean;
};

export async function checkoutBook(bookId: string, studentId: string, dueDateIso: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertLibrarian(session.user);
  const tenant = await getTenant(session.user);

  const result = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findFirst({ where: { id: bookId, tenantId: tenant.id } });
    if (!book) return { error: STABLE_ERROR.BOOK_NOT_FOUND } as const;
    if (book.availableCopies < 1) return { error: STABLE_ERROR.BOOK_NOT_AVAILABLE } as const;

    const student = await tx.student.findFirst({ where: { id: studentId, tenantId: tenant.id } });
    if (!student) return { error: STABLE_ERROR.INVALID_TARGET } as const;

    await tx.book.update({ where: { id: bookId }, data: { availableCopies: { decrement: 1 } } });
    await tx.bookLoan.create({
      data: { tenantId: tenant.id, bookId, studentId, dueDate: new Date(dueDateIso) },
    });

    return { success: true } as const;
  });

  safeRevalidate('/admin/library');
  return result;
}

export async function returnBook(loanId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertLibrarian(session.user);
  const tenant = await getTenant(session.user);

  const result = await prisma.$transaction(async (tx) => {
    const loan = await tx.bookLoan.findFirst({ where: { id: loanId, tenantId: tenant.id } });
    if (!loan) return { error: STABLE_ERROR.LOAN_NOT_FOUND } as const;
    if (loan.returnedAt) return { error: STABLE_ERROR.LOAN_ALREADY_RETURNED } as const;

    await tx.bookLoan.update({ where: { id: loanId }, data: { returnedAt: new Date() } });
    await tx.book.update({ where: { id: loan.bookId }, data: { availableCopies: { increment: 1 } } });

    return { success: true } as const;
  });

  safeRevalidate('/admin/library');
  return result;
}

export async function getActiveLoans(): Promise<LoanRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertLibrarian(session.user);
  const tenant = await getTenant(session.user);

  const loans = await prisma.bookLoan.findMany({
    where: { tenantId: tenant.id, returnedAt: null },
    include: { book: true, student: true },
    orderBy: { dueDate: 'asc' },
  });

  const now = new Date();
  return loans.map((l) => ({
    id: l.id,
    bookTitle: l.book.title,
    studentName: `${l.student.firstName} ${l.student.lastName}`,
    borrowedAt: l.borrowedAt.toISOString(),
    dueDate: l.dueDate.toISOString(),
    returnedAt: null,
    isOverdue: l.dueDate < now,
  }));
}

export async function getStudentLoans(studentId: string): Promise<LoanRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);
  await assertLoanAccess(tenant.id, studentId, session.user);

  const loans = await prisma.bookLoan.findMany({
    where: { tenantId: tenant.id, studentId },
    include: { book: true },
    orderBy: { borrowedAt: 'desc' },
  });

  const now = new Date();
  return loans.map((l) => ({
    id: l.id,
    bookTitle: l.book.title,
    studentName: '',
    borrowedAt: l.borrowedAt.toISOString(),
    dueDate: l.dueDate.toISOString(),
    returnedAt: l.returnedAt?.toISOString() ?? null,
    isOverdue: !l.returnedAt && l.dueDate < now,
  }));
}
