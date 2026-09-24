'use server';

import prisma from '@/lib/prisma';

export type CommunicationMessageSentActivity = {
  type: 'communication.message.sent';
  conversationId: string;
  messageId: string;
  senderUserId: string | null;
  kind: 'new_conversation' | 'reply';
};

// Central helper for emitting ActivityEvent with safe metadata.
// IMPORTANT: Never include message body, user emails, or names.
export async function emitCommunicationMessageSentActivity(input: {
  tenantId: string;
  actorUserId: string | null;
  conversationId: string;
  messageId: string;
  kind: 'new_conversation' | 'reply';
}): Promise<void> {
  await prisma.activityEvent.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      entityType: 'communication',
      entityId: input.conversationId,
      action: 'communication.message.sent',
      metadata: JSON.stringify({
        type: 'communication.message.sent',
        conversationId: input.conversationId,
        messageId: input.messageId,
        senderUserId: input.actorUserId,
        kind: input.kind,
      } satisfies CommunicationMessageSentActivity),
    },
  });
}
