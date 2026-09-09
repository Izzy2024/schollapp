'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { STABLE_ERROR } from '@/lib/errors';
import { sendEmail } from '@/lib/email';

const RESET_TTL_HOURS = 1;

/**
 * Always returns success regardless of whether the email exists, so this
 * endpoint can't be used to enumerate registered accounts.
 */
export async function requestPasswordReset(email: string): Promise<{ success: true }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user && user.isActive) {
    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${process.env.APP_URL ?? ''}/reset-password?token=${token}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Recupera tu contraseña',
        html: `<p>Hola ${user.fullName},</p><p>Restablece tu contraseña con el siguiente enlace (expira en 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si no solicitaste esto, ignora este correo.</p>`,
      });
    } catch (err) {
      console.error('Error sending password reset email:', err);
    }
  }

  return { success: true };
}

export async function resetPassword(input: { token: string; newPassword: string }): Promise<{ success: true } | { error: string }> {
  if (typeof input.newPassword !== 'string' || input.newPassword.length < 8)
    return { error: STABLE_ERROR.WEAK_PASSWORD };

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: input.token } });
  if (!resetToken) return { error: STABLE_ERROR.RESET_TOKEN_NOT_FOUND };
  if (resetToken.usedAt) return { error: STABLE_ERROR.RESET_TOKEN_USED };
  if (resetToken.expiresAt < new Date()) return { error: STABLE_ERROR.RESET_TOKEN_EXPIRED };

  const passwordHash = await bcrypt.hash(input.newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}
