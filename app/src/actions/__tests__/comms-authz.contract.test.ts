import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { getAnnouncements } from '@/actions/announcements';
import { listRecipients } from '@/actions/messages';
import { getInvitationInfo } from '@/actions/invitations';
import { escapeHtml } from '@/lib/html-escape';
import {
  INVITE_IP_LIMIT,
  INVITE_IP_WINDOW_MS,
  clearRateLimit,
  inviteIpKey,
  isRateLimited,
  registerAttempt,
} from '@/lib/rate-limit';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function makeMember(tenantId: string, tag: string, roleName: string | null) {
  const user = await prisma.user.create({
    data: { email: `${tag}@ex.com`, fullName: tag, passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId, userId: user.id, status: 'active' } });
  if (roleName) {
    // Nombre exacto: el filtro de listRecipients matchea admin/director/
    // teacher por nombre. Upsert porque varios miembros comparten rol.
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId, name: roleName } },
      update: {},
      create: { tenantId, name: roleName },
    });
    await prisma.userRole.create({ data: { tenantId, userId: user.id, roleId: role.id } });
  }
  return user;
}

describe('comms authz contract (1.12) — NO mock.module, Postgres real', () => {
  it('getAnnouncements: student no ve borradores, admin sí', async () => {
    const tag = uniq('t-comms-ann');
    const tenant = await prisma.tenant.create({
      data: { slug: tag, name: `School ${tag}`, timezone: 'America/Panama' },
    });
    const admin = await makeMember(tenant.id, `${tag}-admin`, 'admin');
    const student = await makeMember(tenant.id, `${tag}-student`, 'student');

    await prisma.announcement.create({
      data: { tenantId: tenant.id, title: `Borrador ${tag}`, body: 'x', createdById: admin.id, publishedAt: null },
    });
    await prisma.announcement.create({
      data: { tenantId: tenant.id, title: `Publicado ${tag}`, body: 'x', createdById: admin.id, publishedAt: new Date() },
    });

    setTestSession({ id: student.id, tenantSlug: tenant.slug, roles: ['student'] });
    try {
      const rows = await getAnnouncements();
      assert.equal(rows.length, 1);
      assert.ok(rows[0].publishedAt);
    } finally {
      clearTestSession();
    }

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    try {
      const rows = await getAnnouncements();
      assert.equal(rows.length, 2);
      assert.equal(rows.filter((r) => r.publishedAt === null).length, 1);
    } finally {
      clearTestSession();
    }
  });

  it('listRecipients: student solo ve gestión/docentes; teacher ve todo', async () => {
    const tag = uniq('t-comms-rec');
    const tenant = await prisma.tenant.create({
      data: { slug: tag, name: `School ${tag}`, timezone: 'America/Panama' },
    });
    const admin = await makeMember(tenant.id, `${tag}-admin`, 'admin');
    const teacher = await makeMember(tenant.id, `${tag}-teacher`, 'teacher');
    const parent = await makeMember(tenant.id, `${tag}-parent`, 'parent');
    const student = await makeMember(tenant.id, `${tag}-student`, 'student');
    const peer = await makeMember(tenant.id, `${tag}-peer`, 'student');

    setTestSession({ id: student.id, tenantSlug: tenant.slug, roles: ['student'] });
    try {
      const emails = (await listRecipients()).map((r) => r.email);
      assert.ok(emails.includes(admin.email), 'el alumno debe ver al admin');
      assert.ok(emails.includes(teacher.email), 'el alumno debe ver a su docente');
      assert.ok(!emails.includes(parent.email), 'fuga: email de otro padre visible');
      assert.ok(!emails.includes(peer.email), 'fuga: email de otro alumno visible');
    } finally {
      clearTestSession();
    }

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    try {
      const emails = (await listRecipients()).map((r) => r.email);
      assert.ok(emails.includes(parent.email), 'el docente debe ver a los padres');
      assert.ok(emails.includes(peer.email), 'el docente debe ver a los alumnos');
    } finally {
      clearTestSession();
    }
  });

  it('escapeHtml neutraliza <script> y comillas', () => {
    assert.equal(
      escapeHtml(`<script>alert("x")</script>`),
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
    assert.equal(escapeHtml(`a&b'c`), 'a&amp;b&#39;c');
    assert.equal(escapeHtml(null), '');
  });

  it('invitaciones: bucket por IP bloquea al llegar al límite; código inválido estable', async () => {
    // El bucket vive en los helpers de rate-limit (misma pieza que usa el
    // login): se maneja con una IP explícita porque getClientIp() devuelve
    // 'unknown' bajo tsx (sin request scope), igual que en rateLimit.contract.test.ts.
    const key = inviteIpKey(`10.9.9.${Math.floor(Math.random() * 200) + 1}`);
    try {
      let limited = false;
      for (let i = 0; i < INVITE_IP_LIMIT + 5; i++) {
        if (await isRateLimited(key, INVITE_IP_LIMIT, INVITE_IP_WINDOW_MS)) {
          limited = true;
          break;
        }
        await registerAttempt(key, INVITE_IP_WINDOW_MS);
      }
      assert.equal(limited, true);

      // Código inválido: respuesta estable, sin fuga (25 llamadas seguidas).
      for (let i = 0; i < 25; i++) {
        assert.deepEqual(await getInvitationInfo('codigo-que-no-existe'), {
          error: 'INVITE_NOT_FOUND',
        });
      }
    } finally {
      await clearRateLimit(key);
    }
  });
});
