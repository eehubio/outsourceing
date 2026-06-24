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
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  try {
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
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

// 统一的 cookie 选项：生产环境 HTTPS 必须 secure，否则浏览器在跳转后可能丢弃；
// 显式 maxAge 让会话持久化（默认会话级 cookie 在某些场景下不稳定）。
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 天
  };
}

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
