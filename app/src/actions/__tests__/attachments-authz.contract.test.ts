import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { uploadAttachment, getAttachments, deleteAttachment } from '@/actions/attachments';
import { GET as downloadFile } from '@/app/api/files/[attachmentId]/route';
import { NextRequest } from 'next/server';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function makeUser(tag: string, fullName: string) {
  return prisma.user.create({
    data: { email: `${tag}@ex.com`, fullName, passwordHash: 'x', isActive: true },
  });
}

async function setupSchool(prefix: string) {
  const tag = uniq(prefix);
  const tenant = await prisma.tenant.create({
    data: { slug: tag, name: `School ${tag}`, timezone: 'America/Panama' },
  });
  const admin = await makeUser(`${tag}-admin`, 'Admin');
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

  const teacherUser = await makeUser(`${tag}-teacher`, 'Docente');
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id, status: 'active' } });
  const staff = await prisma.staff.create({
    data: { tenantId: tenant.id, fullName: 'Docente', userId: teacherUser.id, isActive: true },
  });

  const year = await prisma.academicYear.create({
    data: {
      tenantId: tenant.id,
      name: `2026-${tag}`,
      startDate: new Date('2026-03-01T00:00:00Z'),
      endDate: new Date('2026-12-15T00:00:00Z'),
      isActive: true,
    },
  });
  const grade = await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: `G1-${tag}`, name: 'Primero' } });
  const section = await prisma.section.create({
    data: { tenantId: tenant.id, academicYearId: year.id, gradeLevelId: grade.id, name: 'A' },
  });
  const subject = await prisma.subject.create({ data: { tenantId: tenant.id, name: `Mat-${tag}` } });
  const sectionSubject = await prisma.sectionSubject.create({
    data: { tenantId: tenant.id, sectionId: section.id, subjectId: subject.id, staffId: staff.id },
  });
  const term = await prisma.term.create({
    data: {
      tenantId: tenant.id,
      academicYearId: year.id,
      name: 'Trim 1',
      startDate: new Date('2026-03-01T00:00:00Z'),
      endDate: new Date('2026-06-30T00:00:00Z'),
    },
  });
  const evaluation = await prisma.evaluation.create({
    data: {
      tenantId: tenant.id,
      sectionSubjectId: sectionSubject.id,
      termId: term.id,
      name: 'Tarea 1',
      type: 'homework',
      date: new Date(),
      maxScore: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  async function makeStudent(label: string) {
    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Al', lastName: label, email: `${tag}-${label}@ex.com`, status: 'active' },
    });
    const studentUser = await makeUser(`${tag}-${label}`, `Al ${label}`);
    // La identidad de alumno se resuelve por email de sesión: mismo email.
    await prisma.student.update({ where: { id: student.id }, data: { email: studentUser.email } });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: studentUser.id, status: 'active' } });
    await prisma.enrollment.create({
      data: { tenantId: tenant.id, studentId: student.id, academicYearId: year.id, sectionId: section.id, status: 'enrolled' },
    });
    return { student, studentUser };
  }

  const owner = await makeStudent('owner');
  const other = await makeStudent('other');

  return { tenant, admin, teacherUser, staff, sectionSubject, evaluation, owner, other };
}

function uploadForm(file: File, ownerType: string, ownerId: string) {
  const fd = new FormData();
  fd.set('file', file);
  fd.set('ownerType', ownerType);
  fd.set('ownerId', ownerId);
  return fd;
}

function downloadRequest(attachmentId: string) {
  return new NextRequest(`http://test.local/api/files/${attachmentId}`);
}

describe('attachments authz contract (1.10) — NO mock.module, Postgres real', () => {
  it('rechaza subir text/html (fuera de la whitelist)', async () => {
    const school = await setupSchool('t-att-type');
    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const file = new File(['<html><script>alert(1)</script>'], 'evil.html', { type: 'text/html' });
      await assert.rejects(
        () => uploadAttachment(uploadForm(file, 'tenant', 'general')),
        /Tipo de archivo no permitido/
      );
    } finally {
      clearTestSession();
    }
  });

  it('rechaza subir un archivo de 15 MB (límite 10 MB)', async () => {
    const school = await setupSchool('t-att-size');
    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const file = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 });
      await assert.rejects(() => uploadAttachment(uploadForm(file, 'tenant', 'general')), /supera el tamaño/);
    } finally {
      clearTestSession();
    }
  });

  it('subida válida: guarda fuera de public/ y devuelve URL /api/files/:id', async () => {
    const school = await setupSchool('t-att-ok');
    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const file = new File(['%PDF-1.4 contenido'], 'tarea.pdf', { type: 'application/pdf' });
      const res = await uploadAttachment(uploadForm(file, 'tenant', 'general'));
      assert.equal(res.success, true);
      assert.equal(res.attachment.fileUrl, `/api/files/${res.attachment.id}`);

      const record = await prisma.attachment.findUnique({ where: { id: res.attachment.id } });
      assert.ok(record);
      assert.ok(!record!.fileKey.startsWith('/uploads'), `sigue en public/: ${record!.fileKey}`);
      assert.ok(!record!.fileKey.startsWith('/'), `fileKey absoluto/URL: ${record!.fileKey}`);

      await deleteAttachment(res.attachment.id);
      assert.equal(await prisma.attachment.findUnique({ where: { id: res.attachment.id } }), null);
    } finally {
      clearTestSession();
    }
  });

  it('submission: el dueño ve y el docente dueño borra; otro alumno es rechazado', async () => {
    const school = await setupSchool('t-att-sub');
    const ownerId = `${school.evaluation.id}:${school.owner.student.id}`;
    const record = await prisma.attachment.create({
      data: {
        tenantId: school.tenant.id,
        ownerType: 'submission',
        ownerId,
        fileName: 'tarea.pdf',
        fileKey: '.uploads/fantasma.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10,
      },
    });

    // Dueño ve su entrega.
    setTestSession({
      id: school.owner.studentUser.id,
      tenantSlug: school.tenant.slug,
      roles: ['student'],
      email: school.owner.studentUser.email,
    });
    try {
      const mine = await getAttachments('submission', ownerId);
      assert.equal(mine.length, 1);
    } finally {
      clearTestSession();
    }

    // Otro alumno no ve ni puede borrar.
    setTestSession({
      id: school.other.studentUser.id,
      tenantSlug: school.tenant.slug,
      roles: ['student'],
      email: school.other.studentUser.email,
    });
    try {
      assert.equal((await getAttachments('submission', ownerId)).length, 0);
      await assert.rejects(() => deleteAttachment(record.id), /No autorizado/);
    } finally {
      clearTestSession();
    }

    // Docente dueño de la evaluación sí puede borrar.
    setTestSession({ id: school.teacherUser.id, tenantSlug: school.tenant.slug, roles: ['teacher'] });
    try {
      const res = await deleteAttachment(record.id);
      assert.deepEqual(res, { success: true });
    } finally {
      clearTestSession();
    }
  });

  it('tenant: cualquiera del tenant ve, pero borrar exige rol de gestión', async () => {
    const school = await setupSchool('t-att-tenant');
    const record = await prisma.attachment.create({
      data: {
        tenantId: school.tenant.id,
        ownerType: 'tenant',
        ownerId: 'general',
        fileName: 'doc.pdf',
        fileKey: '.uploads/fantasma.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10,
      },
    });

    setTestSession({
      id: school.owner.studentUser.id,
      tenantSlug: school.tenant.slug,
      roles: ['student'],
      email: school.owner.studentUser.email,
    });
    try {
      assert.equal((await getAttachments('tenant', 'general')).length, 1);
      await assert.rejects(() => deleteAttachment(record.id), /No autorizado/);
    } finally {
      clearTestSession();
    }

    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      assert.deepEqual(await deleteAttachment(record.id), { success: true });
    } finally {
      clearTestSession();
    }
  });

  it('GET /api/files/:id: dueño descarga (attachment), otro tenant recibe 404', async () => {
    const school = await setupSchool('t-att-route');
    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    let attachmentId: string;
    try {
      const file = new File(['hola descarga'], 'nota.pdf', { type: 'application/pdf' });
      const res = await uploadAttachment(uploadForm(file, 'tenant', 'general'));
      attachmentId = res.attachment.id;
    } finally {
      clearTestSession();
    }

    // Dueño del tenant: 200 + descarga forzada.
    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const res = await downloadFile(downloadRequest(attachmentId!), {
        params: Promise.resolve({ attachmentId: attachmentId! }),
      });
      assert.equal(res.status, 200);
      assert.match(String(res.headers.get('content-disposition')), /attachment/);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      assert.equal(await res.text(), 'hola descarga');
    } finally {
      clearTestSession();
    }

    // Otro tenant: no ve nada (404, sin fuga de existencia).
    const schoolB = await setupSchool('t-att-route-b');
    setTestSession({ id: schoolB.admin.id, tenantSlug: schoolB.tenant.slug, roles: ['admin'] });
    try {
      const res = await downloadFile(downloadRequest(attachmentId!), {
        params: Promise.resolve({ attachmentId: attachmentId! }),
      });
      assert.equal(res.status, 404);
    } finally {
      clearTestSession();
    }

    // Limpieza del archivo real en disco.
    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      await deleteAttachment(attachmentId!);
    } finally {
      clearTestSession();
    }
  });
});
