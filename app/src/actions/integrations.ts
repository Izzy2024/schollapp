'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import * as googleClassroom from '@/lib/integrations/googleClassroom';

type Session = {
  id: string;
  tenantSlug?: string | null;
  roles?: string[] | null;
};

async function getAdminTenant(session: Session) {
  const roles = session.roles ?? [];
  if (!roles.includes('admin') && !roles.includes('director')) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }
  if (!session.tenantSlug) throw new Error('Tenant not found');
  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
}

export type IntegrationStatus = {
  provider: string;
  label: string;
  available: boolean;
  connected: boolean;
  accountEmail: string | null;
  unavailableReason: string | null;
};

export async function getIntegrationsStatus(): Promise<IntegrationStatus[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getAdminTenant(session.user);

  const classroomRow = await prisma.externalIntegration.findUnique({
    where: { tenantId_provider: { tenantId: tenant.id, provider: 'google_classroom' } },
  });

  return [
    {
      provider: 'google_classroom',
      label: 'Google Classroom',
      available: googleClassroom.isConfigured(),
      connected: classroomRow?.status === 'connected',
      accountEmail: classroomRow?.externalAccountEmail ?? null,
      unavailableReason: googleClassroom.isConfigured() ? null : 'Falta configurar GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET',
    },
    {
      provider: 'sis_estatal',
      label: 'SIS Estatal',
      available: false,
      connected: false,
      accountEmail: null,
      unavailableReason: 'Pendiente de especificación de API por parte del Ministerio de Educación',
    },
  ];
}

export async function getGoogleClassroomConnectUrl(): Promise<{ url: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getAdminTenant(session.user);

  if (!googleClassroom.isConfigured()) return { error: STABLE_ERROR.INTEGRATION_NOT_CONFIGURED };

  const state = crypto.randomBytes(24).toString('base64url');

  await prisma.externalIntegration.upsert({
    where: { tenantId_provider: { tenantId: tenant.id, provider: 'google_classroom' } },
    update: { pendingState: state },
    create: { tenantId: tenant.id, provider: 'google_classroom', pendingState: state },
  });

  return { url: googleClassroom.getAuthUrl(state) };
}

export async function disconnectGoogleClassroom(): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getAdminTenant(session.user);

  await prisma.externalIntegration.updateMany({
    where: { tenantId: tenant.id, provider: 'google_classroom' },
    data: { status: 'disconnected', accessToken: null, refreshToken: null, tokenExpiresAt: null, externalAccountEmail: null, connectedAt: null },
  });

  return { success: true };
}

/** Called by the OAuth callback route (no user session — Google redirects the browser here). */
export async function completeGoogleClassroomConnection(code: string, state: string): Promise<{ success: true; tenantSlug: string } | { error: string }> {
  const integration = await prisma.externalIntegration.findUnique({ where: { pendingState: state } });
  if (!integration) return { error: STABLE_ERROR.INVALID_OAUTH_STATE };

  const tenant = await prisma.tenant.findUnique({ where: { id: integration.tenantId } });
  if (!tenant) return { error: STABLE_ERROR.INVALID_OAUTH_STATE };

  const tokens = await googleClassroom.exchangeCodeForTokens(code);
  const email = await googleClassroom.getUserEmail(tokens.access_token);

  await prisma.externalIntegration.update({
    where: { id: integration.id },
    data: {
      status: 'connected',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? integration.refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      externalAccountEmail: email,
      connectedAt: new Date(),
      pendingState: null,
    },
  });

  return { success: true, tenantSlug: tenant.slug };
}

export type ClassroomCourseRow = { id: string; name: string };

// ponytail: no refresh-token flow yet — the stored access token expires (see
// tokenExpiresAt) and listGoogleClassroomCourses() will start failing once it
// does. Add a refresh step here (POST refresh_token grant to Google's token
// endpoint) when this integration moves past proof-of-connection.
export async function listGoogleClassroomCourses(): Promise<ClassroomCourseRow[] | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getAdminTenant(session.user);

  const integration = await prisma.externalIntegration.findUnique({
    where: { tenantId_provider: { tenantId: tenant.id, provider: 'google_classroom' } },
  });
  if (!integration || integration.status !== 'connected' || !integration.accessToken) {
    return { error: STABLE_ERROR.INTEGRATION_NOT_CONNECTED };
  }

  return googleClassroom.listCourses(integration.accessToken);
}
