import { NextRequest, NextResponse } from 'next/server';
import { completeGoogleClassroomConnection } from '@/actions/integrations';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const appUrl = process.env.APP_URL ?? request.nextUrl.origin;

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=missing_params`);
  }

  const result = await completeGoogleClassroomConnection(code, state);
  if ('error' in result) {
    return NextResponse.redirect(`${appUrl}/admin/integrations?error=${result.error}`);
  }

  return NextResponse.redirect(`${appUrl}/admin/integrations?connected=google_classroom`);
}
