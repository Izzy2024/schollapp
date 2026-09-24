import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { sendMessage, sendMessageInConversation } from '@/actions/messages';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

type CommunicationMessageSentMetadata = {
  type: 'communication.message.sent';
  conversationId: string;
  messageId: string;
  senderUserId: string | null;
  kind: 'new_conversation' | 'reply';
};

function parseMetadata(raw: string | null): CommunicationMessageSentMetadata {
  assert.ok(raw, 'expected metadata to be present');
  const parsed = JSON.parse(raw) as CommunicationMessageSentMetadata;
  assert.equal(parsed.type, 'communication.message.sent');
  assert.ok(parsed.conversationId);
  assert.ok(parsed.messageId);
  assert.ok(parsed.kind === 'new_conversation' || parsed.kind === 'reply');

  // No-PII guard: metadata must not include any message body or emails/names.
  // We only allow ids + kind.
  assert.equal((parsed as any).body, undefined);
  assert.equal((parsed as any).email, undefined);
  assert.equal((parsed as any).fullName, undefined);

  return parsed;
}

describe('M004 communication activity contracts (communication.message.sent) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('sendMessage emits ActivityEvent with parse-safe no-PII metadata (new conversation)', async () => {
    const tenant = await prisma.tenant.create({
      data: { slug: `t-comm-${Date.now()}`, name: 'Tenant Comm', timezone: 'America/Mexico_City' },
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

    setTestSession({ id: sender.id, tenantSlug: tenant.slug, roles: ['parent'] });
    const sent = await sendMessage({ toUserId: recipient.id, body: 'hola' });

    const ev = await prisma.activityEvent.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'communication.message.sent',
        entityId: sent.conversationId,
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      select: { metadata: true, actorUserId: true },
    });

    assert.ok(ev);
    const md = parseMetadata(ev.metadata);
    assert.equal(md.conversationId, sent.conversationId);
    assert.equal(md.messageId, sent.messageId);
    assert.equal(md.kind, 'new_conversation');
    assert.equal(ev.actorUserId, sender.id);

    clearTestSession();
  });

  it('sendMessageInConversation emits ActivityEvent with parse-safe no-PII metadata (reply)', async () => {
    const tenant = await prisma.tenant.create({
      data: { slug: `t-comm-r-${Date.now()}`, name: 'Tenant Comm Reply', timezone: 'America/Mexico_City' },
      select: { id: true, slug: true },
    });

    const [sender, recipient] = await Promise.all([
      prisma.user.create({ data: { email: `s2-${Date.now()}@ex.com`, fullName: 'Sender2', passwordHash: 'demo-hash-123', isActive: true } }),
      prisma.user.create({ data: { email: `r2-${Date.now()}@ex.com`, fullName: 'Recipient2', passwordHash: 'demo-hash-123', isActive: true } }),
    ]);

    await prisma.userMembership.createMany({
      data: [
        { tenantId: tenant.id, userId: sender.id, status: 'active' },
        { tenantId: tenant.id, userId: recipient.id, status: 'active' },
      ],
    });

    setTestSession({ id: sender.id, tenantSlug: tenant.slug, roles: ['parent'] });
    const first = await sendMessage({ toUserId: recipient.id, body: 'hola' });

    // reply as recipient
    setTestSession({ id: recipient.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    const reply = await sendMessageInConversation({ conversationId: first.conversationId, body: 'reply' });

    const ev = await prisma.activityEvent.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'communication.message.sent',
        entityId: first.conversationId,
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      select: { metadata: true, actorUserId: true },
    });

    assert.ok(ev);
    const md = parseMetadata(ev.metadata);
    assert.equal(md.conversationId, first.conversationId);
    assert.equal(md.messageId, reply.messageId);
    assert.equal(md.kind, 'reply');
    assert.equal(ev.actorUserId, recipient.id);

    clearTestSession();
  });
});
