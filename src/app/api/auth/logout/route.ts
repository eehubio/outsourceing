import { cookies } from 'next/headers';
import { sessionCookieName } from '@/lib/auth/session';
import { ok } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST() {
  cookies().delete(sessionCookieName());
  return ok({ ok: true });
}
