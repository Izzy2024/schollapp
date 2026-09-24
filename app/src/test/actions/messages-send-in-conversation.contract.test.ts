import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

let prismaMock: any;
let sendMessageInConversation: typeof import('@/actions/messages').sendMessageInConversation;

describe('messages contract: sendMessageInConversation (write path)', () => {
  // Test seams are process-global in the shared runner: reset them so later suites use the real DB.
  after(() => {
    delete (globalThis as any).__TEST_PRISMA__;
    delete (globalThis as any).__TEST_SESSION__;
  });

  before(async () => {
    prismaMock = {
      // requireSession() resuelve el tenant con prisma.tenant.findFirst
      // (slug o id de la sesión). Sin este modelo el mock falla con
      // "Cannot read properties of undefined (reading 'findFirst')".
      tenant: {
        findFirst: async () => ({ id: 'tenant-1' }),
      },
      messageParticipant: {
        findFirst: async () => ({ id: 'mp-1' }),
      },
      message: {
        createCalls: [] as any[],
        create: async (args: any) => {
          prismaMock.message.createCalls.push(args);
          return { id: 'msg-1' };
        },
      },
      messageConversation: {
        updateCalls: [] as any[],
        update: async (args: any) => {
          prismaMock.messageConversation.updateCalls.push(args);
          return { id: args.where.id };
        },
      },
      // La emisión de actividad (best-effort, dentro de try/catch en la action)
      // también pasa por prisma; se mockea para no tocar la DB real.
      activityEvent: {
        create: async () => ({ id: 'ev-1' }),
      },
      $transaction: async (fn: any) => fn(prismaMock),
    };

    (globalThis as any).__TEST_PRISMA__ = prismaMock;
    (globalThis as any).__TEST_SESSION__ = {
      user: { id: 'teacher-1', tenantSlug: 'school-a', roles: ['teacher'] },
    };

    const mod = await import('@/actions/messages');
    sendMessageInConversation = mod.sendMessageInConversation;
  });

  beforeEach(() => {
    prismaMock.message.createCalls = [];
    prismaMock.messageConversation.updateCalls = [];
  });

  it('creates a message and returns messageId', async () => {
    const res = await sendMessageInConversation({ conversationId: 'convo-1', body: 'hola' });

    assert.equal(res.messageId, 'msg-1');
    assert.equal(prismaMock.message.createCalls.length, 1);

    const createArgs = prismaMock.message.createCalls[0];
    assert.equal(createArgs.data.conversationId, 'convo-1');
    assert.equal(createArgs.data.senderId, 'teacher-1');
    assert.equal(createArgs.data.body, 'hola');

    assert.equal(prismaMock.messageConversation.updateCalls.length, 1);
    assert.equal(prismaMock.messageConversation.updateCalls[0].where.id, 'convo-1');
  });
});
