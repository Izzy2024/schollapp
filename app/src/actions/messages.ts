'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { emitCommunicationMessageSentActivity } from '@/actions/activity-emit';

export type MessageConversationListItemDTO = {
  conversationId: string;
  otherUser: { id: string; fullName: string; email: string } | null;
  lastMessage: { id: string; body: string; createdAt: Date } | null;
  unreadCount: number;
  updatedAt: Date;
};

export type MessageDTO = {
  id: string;
  sender: { id: string; fullName: string; email: string };
  body: string;
  createdAt: Date;
};

export type MessageRecipientDTO = {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
};

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);

  // In this codebase, session.user may exist in two shapes (NextAuth vs test seam).
  // Normalize tenantSlug from either.
  // tenantSlug is required for multi-tenant data isolation. Some flows may only set tenantId; accept it too.
  const tenantSlug = ((session.user as any).tenantSlug ?? (session.user as any).tenantId) as string | undefined;
  const tenantId = (session.user as any).tenantId as string | undefined;
  const tenantKey = (tenantSlug ?? tenantId) as string | undefined;
  if (!tenantKey) throw stableError(STABLE_ERROR.INVALID_TARGET);

  // In some session shapes we may only have tenantId. Accept either.
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: tenantKey }, { id: tenantKey }],
    },
    select: { id: true },
  });
  if (!tenant) throw stableError(STABLE_ERROR.INVALID_TARGET);

  return {
    tenantId: tenant.id,
    actorUserId: session.user.id,
    roles: (session.user.roles ?? []) as string[],
  };
}

function assertMessagingAccess(roles: string[] = []) {
  // MVP: allow all authenticated users to use messaging surfaces.
  // Data safety is enforced by tenantId resolution + participant checks.
  if (roles) return;
}

async function assertParticipant(opts: { tenantId: string; conversationId: string; userId: string }) {
  const p = await prisma.messageParticipant.findFirst({
    where: { tenantId: opts.tenantId, conversationId: opts.conversationId, userId: opts.userId },
    select: { id: true },
  });
  if (!p) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

export async function listConversationsForUser(): Promise<MessageConversationListItemDTO[]> {
  const ctx = await requireSession();
  assertMessagingAccess(ctx.roles);

  const conversations = await prisma.messageConversation.findMany({
    where: {
      tenantId: ctx.tenantId,
      participants: { some: { userId: ctx.actorUserId } },
    },
    select: {
      id: true,
      updatedAt: true,
      participants: {
        select: {
          userId: true,
          lastReadAt: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
      messages: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { id: true, body: true, createdAt: true },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });

  const unreadCounts = await Promise.all(
    conversations.map(async (c) => {
      const me = c.participants.find((p) => p.userId === ctx.actorUserId);
      const lastReadAt = me?.lastReadAt ?? null;

      const count = await prisma.message.count({
        where: {
          tenantId: ctx.tenantId,
          conversationId: c.id,
          senderId: { not: ctx.actorUserId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return [c.id, count] as const;
    })
  );

  const unreadByConversation = new Map(unreadCounts);

  return conversations.map((c) => {
    const other = c.participants.find((p) => p.userId !== ctx.actorUserId);

    return {
      conversationId: c.id,
      otherUser: other?.user ?? null,
      lastMessage: c.messages[0] ?? null,
      unreadCount: unreadByConversation.get(c.id) ?? 0,
      updatedAt: c.updatedAt,
    };
  });
}

export async function listMessages(conversationId: string): Promise<MessageDTO[]> {
  const ctx = await requireSession();
  assertMessagingAccess(ctx.roles);
  await assertParticipant({ tenantId: ctx.tenantId, conversationId, userId: ctx.actorUserId });

  const messages = await prisma.message.findMany({
    where: { tenantId: ctx.tenantId, conversationId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      body: true,
      createdAt: true,
      sender: { select: { id: true, fullName: true, email: true } },
    },
  });

  return messages;
}

export async function sendMessage(input: { toUserId: string; body: string }): Promise<{ conversationId: string; messageId: string }> {
  const ctx = await requireSession();
  assertMessagingAccess(ctx.roles);

  const body = (input.body ?? '').trim();
  if (!body) throw stableError(STABLE_ERROR.INVALID_TARGET);

  if (input.toUserId === ctx.actorUserId) throw stableError(STABLE_ERROR.INVALID_TARGET);

  // Ensure the recipient is in the same tenant (membership)
  const recipientMembership = await prisma.userMembership.findFirst({
    where: { tenantId: ctx.tenantId, userId: input.toUserId, status: 'active' },
    select: { id: true },
  });
  if (!recipientMembership) throw stableError(STABLE_ERROR.INVALID_TARGET);

  // Find existing 1:1 conversation between these two users (in tenant)
  const existing = await prisma.messageConversation.findFirst({
    where: {
      tenantId: ctx.tenantId,
      AND: [
        { participants: { some: { userId: ctx.actorUserId } } },
        { participants: { some: { userId: input.toUserId } } },
      ],
    },
    select: { id: true },
  });

  const convoId = existing?.id ?? null;

  const result = await prisma.$transaction(async (tx) => {
    let conversationId = convoId;
    if (!conversationId) {
      const convo = await tx.messageConversation.create({ data: { tenantId: ctx.tenantId } });
      conversationId = convo.id;
      // Use create (not createMany) to ensure FK constraints are enforced per-row with clearer errors.
      // createMany can be finicky with SQLite FK enforcement in dev.
      await tx.messageParticipant.create({
        data: { tenantId: ctx.tenantId, conversationId, userId: ctx.actorUserId, lastReadAt: new Date() },
      });
      await tx.messageParticipant.create({
        data: { tenantId: ctx.tenantId, conversationId, userId: input.toUserId, lastReadAt: null },
      });
    }

    const msg = await tx.message.create({
      data: {
        tenantId: ctx.tenantId,
        conversationId,
        senderId: ctx.actorUserId,
        body,
      },
      select: { id: true },
    });

    // Update updatedAt via touching conversation (updatedAt @updatedAt)
    await tx.messageConversation.update({ where: { id: conversationId }, data: {} });

    // Emit activity outside the tx to keep the messaging write path deterministic.
    // If this fails, the message is still delivered; activity is best-effort.
    return { conversationId, messageId: msg.id };
  });

  try {
    await emitCommunicationMessageSentActivity({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      conversationId: result.conversationId,
      messageId: result.messageId,
      kind: convoId ? 'reply' : 'new_conversation',
    });
  } catch {
    // Never block messaging on activity emission.
  }

  return result;
}

export async function sendMessageInConversation(input: { conversationId: string; body: string }): Promise<{ messageId: string }> {
  const ctx = await requireSession();
  assertMessagingAccess(ctx.roles);

  const conversationId = (input.conversationId ?? '').trim();
  const body = (input.body ?? '').trim();
  if (!conversationId || !body) throw stableError(STABLE_ERROR.INVALID_TARGET);

  await assertParticipant({ tenantId: ctx.tenantId, conversationId, userId: ctx.actorUserId });

  const msg = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        tenantId: ctx.tenantId,
        conversationId,
        senderId: ctx.actorUserId,
        body,
      },
      select: { id: true },
    });

    await tx.messageConversation.update({ where: { id: conversationId }, data: {} });
    return created;
  });

  try {
    await emitCommunicationMessageSentActivity({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      conversationId,
      messageId: msg.id,
      kind: 'reply',
    });
  } catch {
    // Never block messaging on activity emission.
  }

  return { messageId: msg.id };
}

export async function markConversationRead(conversationId: string): Promise<{ ok: true }> {
  const ctx = await requireSession();
  assertMessagingAccess(ctx.roles);
  await assertParticipant({ tenantId: ctx.tenantId, conversationId, userId: ctx.actorUserId });

  await prisma.messageParticipant.updateMany({
    where: { tenantId: ctx.tenantId, conversationId, userId: ctx.actorUserId },
    data: { lastReadAt: new Date() },
  });

  return { ok: true };
}

export async function listRecipients(): Promise<MessageRecipientDTO[]> {
  const ctx = await requireSession();
  assertMessagingAccess(ctx.roles);

  const memberships = await prisma.userMembership.findMany({
    where: { tenantId: ctx.tenantId, status: 'active', userId: { not: ctx.actorUserId } },
    select: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          roles: {
            where: { tenantId: ctx.tenantId },
            select: { role: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ user: { fullName: 'asc' } }, { user: { id: 'asc' } }],
  });

  return memberships.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
    email: m.user.email,
    roles: m.user.roles.map((r) => r.role.name),
  }));
}
