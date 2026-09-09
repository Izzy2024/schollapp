import prisma from '@/lib/prisma';

// -----------------------------------------------------------------------------
// Fixed-window rate limiting backed by Prisma.
//
// Why the DB and not memory: the app runs serverless on Vercel (stateless,
// multiple instances). A global `Map` would be per-instance and trivially
// bypassable. Prisma/SQLite (migrating to Postgres) is the only durable store,
// so attempts live in the `RateLimitEntry` table: one row per key with a
// counter and the window start. No token bucket or sliding window — a simple
// fixed window is enough for login / password-reset abuse prevention.
// -----------------------------------------------------------------------------

export const UNKNOWN_IP = 'unknown';

// Login: 5 failed attempts / 15 min per email, 20 / 15 min per IP (the IP
// bucket catches enumeration spread across many emails from one source).
export const LOGIN_EMAIL_LIMIT = 5;
export const LOGIN_EMAIL_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_IP_LIMIT = 20;
export const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;

// Password reset: 5 requests / hour per email, 20 / hour per IP.
export const PASSWORD_RESET_EMAIL_LIMIT = 5;
export const PASSWORD_RESET_EMAIL_WINDOW_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_IP_LIMIT = 20;
export const PASSWORD_RESET_IP_WINDOW_MS = 60 * 60 * 1000;

export function loginEmailKey(email: string): string {
  return `login:email:${email.trim().toLowerCase()}`;
}

export function loginIpKey(ip: string): string {
  return `login:ip:${ip}`;
}

export function passwordResetEmailKey(email: string): string {
  return `password-reset:email:${email.trim().toLowerCase()}`;
}

export function passwordResetIpKey(ip: string): string {
  return `password-reset:ip:${ip}`;
}

/**
 * Best-effort client IP via `x-forwarded-for` (set by Vercel) with
 * `x-real-ip` fallback. Returns `'unknown'` outside a Next.js request
 * context (e.g. contract tests under tsx) — callers must skip the IP-level
 * bucket in that case instead of sharing one global bucket.
 */
export async function getClientIp(): Promise<string> {
  try {
    const { headers } = await import('next/headers');
    const store = await headers();
    const forwarded = store.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
    const realIp = store.get('x-real-ip')?.trim();
    if (realIp) return realIp;
    return UNKNOWN_IP;
  } catch {
    return UNKNOWN_IP;
  }
}

function isWindowExpired(windowStart: Date, windowMs: number, now: number): boolean {
  return now - windowStart.getTime() >= windowMs;
}

export async function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): Promise<boolean> {
  try {
    const entry = await prisma.rateLimitEntry.findUnique({ where: { key } });
    if (!entry) return false;
    if (isWindowExpired(entry.windowStart, windowMs, now)) return false;
    return entry.attempts >= limit;
  } catch (err) {
    // Fail open: a rate-limit store outage must not lock every user out.
    console.error('[rate-limit] check failed (fail-open):', err);
    return false;
  }
}

export async function registerAttempt(
  key: string,
  windowMs: number,
  now: number = Date.now(),
): Promise<void> {
  try {
    const entry = await prisma.rateLimitEntry.findUnique({ where: { key } });
    if (!entry || isWindowExpired(entry.windowStart, windowMs, now)) {
      await prisma.rateLimitEntry.upsert({
        where: { key },
        create: { key, attempts: 1, windowStart: new Date(now) },
        update: { attempts: 1, windowStart: new Date(now) },
      });
      return;
    }
    await prisma.rateLimitEntry.update({
      where: { key },
      data: { attempts: entry.attempts + 1 },
    });
  } catch (err) {
    console.error('[rate-limit] register failed:', err);
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimitEntry.deleteMany({ where: { key } });
  } catch (err) {
    console.error('[rate-limit] clear failed:', err);
  }
}
