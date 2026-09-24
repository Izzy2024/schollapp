import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

let prismaMock: any;
let sendMessageInConversation: typeof import('@/actions/messages').sendMessageInConversation;

describe('communication activity contract: message.sent', () => {
  before(async () => {
    prismaMock = {
      tenant: {
        findFirst: async () => ({ id: 'tenant-1' }),
      },
      messageParticipant: {
        findFirst: async () => ({ id: 'mp-1' }),
      },
      message: {
        create: async () => ({ id: 'msg-1' }),
      },
      messageConversation: {
        update: async () => ({ id: 'convo-1' }),
      },
      activityEvent: {
        createCalls: [] as any[],
        create: async (args: any) => {
          prismaMock.activityEvent.createCalls.push(args);
          return { id: 'act-1' };
        },
      },
      $transaction: async (fn: any) => fn(prismaMock),
    };

    (globalThis as any).__TEST_PRISMA__ = prismaMock;
    (globalThis as any).__TEST_SESSION__ = {
      user: { id: 'u-1', tenantId: 'tenant-1', tenantSlug: 'school-demo', roles: ['teacher'] },
    };

    const mod = await import('@/actions/messages');
    sendMessageInConversation = mod.sendMessageInConversation;
  });

  beforeEach(() => {
    prismaMock.activityEvent.createCalls = [];
  });

  it('emits communication.message.sent with parse-safe, non-PII metadata', async () => {
    await sendMessageInConversation({ conversationId: 'convo-1', body: 'hola' });

    assert.equal(prismaMock.activityEvent.createCalls.length, 1);
    const call = prismaMock.activityEvent.createCalls[0];

    assert.equal(call.data.action, 'communication.message.sent');
    assert.equal(call.data.entityType, 'communication');
    assert.equal(call.data.entityId, 'convo-1');

    const md = JSON.parse(call.data.metadata);
    assert.equal(md.type, 'communication.message.sent');
    assert.equal(md.conversationId, 'convo-1');
    assert.equal(md.messageId, 'msg-1');
    assert.equal(md.senderUserId, 'u-1');
    assert.equal(md.kind, 'reply');

    // No PII fields
    assert.equal('body' in md, false);
    assert.equal('email' in md, false);
    assert.equal('fullName' in md, false);
  });
});
