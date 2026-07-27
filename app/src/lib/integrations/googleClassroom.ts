const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const CLASSROOM_COURSES_URL = 'https://classroom.googleapis.com/v1/courses';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getRedirectUri(): string {
  return `${process.env.APP_URL ?? ''}/api/integrations/google-classroom/callback`;
}

export function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

export type ClassroomCourse = { id: string; name: string };

export async function listCourses(accessToken: string): Promise<ClassroomCourse[]> {
  const res = await fetch(CLASSROOM_COURSES_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google Classroom API error: ${await res.text()}`);
  const data = await res.json();
  return (data.courses ?? []).map((c: any) => ({ id: c.id, name: c.name }));
}
