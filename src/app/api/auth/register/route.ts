import { cookies } from 'next/headers';
import { registerUser } from '@/lib/auth/credentials';
import { issueSession, sessionCookieName } from '@/lib/auth/session';
import { ok, handleError } from '@/lib/api';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const schema = z.object({
  email: z.string(), name: z.string(), password: z.string(),
  accountType: z.enum(['provider', 'publisher']),
});
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await registerUser(body);
    const token = issueSession(user.id);
    cookies().set(sessionCookieName(), token, { httpOnly: true, sameSite: 'lax', path: '/' });
    return ok({ user: { id: user.id, name: user.name, accountType: user.accountType, platformRole: user.platformRole } }, 201);
  } catch (e) { return handleError(e); }
}
