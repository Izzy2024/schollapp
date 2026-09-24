import prisma from '@/lib/prisma';

/**
 * Reminder delivery helpers, intentionally NOT in a `'use server'` file: they
 * take a raw reminderId with no session and are only meant to be called by the
 * backend reminder pipeline, never as client-invocable server actions.
 */

export async function markReminderSent(reminderId: string, externalId?: string): Promise<void> {
  await prisma.financeReminder.update({
    where: { id: reminderId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      externalId: externalId || null,
    },
  });
}

export async function markReminderFailed(reminderId: string, errorMessage: string): Promise<void> {
  await prisma.financeReminder.update({
    where: { id: reminderId },
    data: {
      status: 'failed',
      errorMessage,
    },
  });
}
