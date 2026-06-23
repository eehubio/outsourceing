import { requireUser } from '@/lib/auth/session';
import { reviewProject } from '@/lib/services/project';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { decision, note } = await req.json();
    const r = await reviewProject(user, params.id, decision, note);
    return ok(r);
  } catch (e) { return handleError(e); }
}
