import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { getTestPrisma } from '@/lib/test-seams';

import { listConversationsForUser, listMessages, markConversationRead, sendMessage } from '@/actions/messages';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

describe('M004 messaging contracts (tenant/participant/unread) — NO mock.module', () => {
  beforeEach(() => {
    // Ensure tests use the real prisma client.
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('participant-only: cannot read messages of a conversation you are not in', async () => {
    // Arrange: create a fresh tenant and 3 users
    const tenant = await prisma.tenant.create({
      data: { slug: `t-msg-${Date.now()}`, name: 'Tenant Msg', timezone: 'America/Mexico_City' },
      select: { id: true, slug: true },
    });

    const [u1, u2, outsider] = await Promise.all([
      prisma.user.create({ data: { email: `u1-${Date.now()}@ex.com`, fullName: 'U1', passwordHash: 'demo-hash-123', isActive: true } }),
      prisma.user.create({ data: { email: `u2-${Date.now()}@ex.com`, fullName: 'U2', passwordHash: 'demo-hash-123', isActive: true } }),
      prisma.user.create({ data: { email: `u3-${Date.now()}@ex.com`, fullName: 'U3', passwordHash: 'demo-hash-123', isActive: true } }),
    ]);

    await prisma.userMembership.createMany({
      data: [
        { tenantId: tenant.id, userId: u1.id, status: 'active' },
        { tenantId: tenant.id, userId: u2.id, status: 'active' },
        { tenantId: tenant.id, userId: outsider.id, status: 'active' },
      ],
    });

    const convo = await prisma.messageConversation.create({ data: { tenantId: tenant.id }, select: { id: true } });
    await prisma.messageParticipant.createMany({
      data: [
        { tenantId: tenant.id, conversationId: convo.id, userId: u1.id, lastReadAt: null },
        { tenantId: tenant.id, conversationId: convo.id, userId: u2.id, lastReadAt: null },
      ],
    });
    await prisma.message.create({
      data: { tenantId: tenant.id, conversationId: convo.id, senderId: u1.id, body: 'hola' },
    });

    // Act/Assert: outsider cannot list messages
    setTestSession({ id: outsider.id, tenantSlug: tenant.slug, roles: ['parent'] });
    await assert.rejects(() => listMessages(convo.id), /UNAUTHORIZED_ROLE/i);

    clearTestSession();
  });

  it('unread determinism: send increments unread for recipient; markRead clears it', async () => {
    const tenant = await prisma.tenant.create({
      data: { slug: `t-unread-${Date.now()}`, name: 'Tenant Unread', timezone: 'America/Mexico_City' },
      select: { id: true, slug: true },
    });

    const [sender, recipient] = await Promise.all([
      prisma.user.create({ data: { email: `s-${Date.now()}@ex.com`, fullName: 'Sender', passwordHash: 'demo-hash-123', isActive: true } }),
      prisma.user.create({ data: { email: `r-${Date.now()}@ex.com`, fullName: 'Recipient', passwordHash: 'demo-hash-123', isActive: true } }),
    ]);

    await prisma.userMembership.createMany({
      data: [
        { tenantId: tenant.id, userId: sender.id, status: 'active' },
        { tenantId: tenant.id, userId: recipient.id, status: 'active' },
      ],
    });

    // Sender sends a message (creates 1:1 conversation)
    setTestSession({ id: sender.id, tenantSlug: tenant.slug, roles: ['parent'] });
    const sent = await sendMessage({ toUserId: recipient.id, body: 'hola' });

    // Recipient sees unread=1
    setTestSession({ id: recipient.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    const inbox1 = await listConversationsForUser();
    const row1 = inbox1.find((c) => c.conversationId === sent.conversationId);
    assert.ok(row1);
    assert.equal(row1.unreadCount, 1);

    // markRead -> unread=0
    await markConversationRead(sent.conversationId);
    const inbox2 = await listConversationsForUser();
    const row2 = inbox2.find((c) => c.conversationId === sent.conversationId);
    assert.ok(row2);
    assert.equal(row2.unreadCount, 0);

    clearTestSession();
  });
});
