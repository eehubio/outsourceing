import { requireUser } from '@/lib/auth/session';
import { payProject } from '@/lib/services/project';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { method } = await req.json().catch(() => ({ method: 'wechat' }));
    const r = await payProject(user, params.id, method || 'wechat');
    return ok(r);
  } catch (e) { return handleError(e); }
}
