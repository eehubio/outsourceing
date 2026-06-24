import { cookies } from 'next/headers';
import { getRepo } from '@/lib/repo';
import { loginUser } from '@/lib/auth/credentials';
import { issueSession, sessionCookieName, sessionCookieOptions, HttpError } from '@/lib/auth/session';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let user;
    if (body.userId) {
      // 演示登录：仅限种子演示账号（有 isDemo 标记），真实账号必须走密码
      user = await getRepo().getUser(body.userId);
      if (!user) throw new HttpError(404, '用户不存在');
      if (!user.isDemo) throw new HttpError(403, '该账号需使用密码登录');
    } else {
      // 真实登录：邮箱 + 密码
      user = await loginUser({ email: body.email, password: body.password });
    }
    const token = issueSession(user.id);
    cookies().set(sessionCookieName(), token, sessionCookieOptions());
    return ok({ user: { id: user.id, name: user.name, accountType: (user as any).accountType, platformRole: user.platformRole } });
  } catch (e) { return handleError(e); }
}
