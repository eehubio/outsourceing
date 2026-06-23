import { getSessionUser } from '@/lib/auth/session';
import { getRepo } from '@/lib/repo';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const u = await getSessionUser();
    if (!u) return ok({ user: null });
    const org = await getRepo().getUserPrimaryOrg(u.id);
    return ok({ user: u, org });
  } catch (e) { return handleError(e); }
}
