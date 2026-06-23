import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getRepo } from '../repo';

const COOKIE = 'ezplm_session';
const SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';

function sign(payload: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verify(token: string): string | null {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch { return null; }
  return payload;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  platformRole: string;
  accountType: string;
}

export function issueSession(userId: string): string { return sign(userId); }
export function sessionCookieName() { return COOKIE; }

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const userId = verify(token);
  if (!userId) return null;
  const user = await getRepo().getUser(userId);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, platformRole: user.platformRole, accountType: (user as { accountType?: string }).accountType || 'provider' };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new HttpError(401, '未登录');
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
