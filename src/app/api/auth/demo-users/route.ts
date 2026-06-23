import { getRepo } from '@/lib/repo';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const users = await getRepo().listDemoUsers();
    return ok({ users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, platformRole: u.platformRole })) });
  } catch (e) { return handleError(e); }
}
