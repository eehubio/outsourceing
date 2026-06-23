import { requireUser } from '@/lib/auth/session';
import { getCooperationWorkspace } from '@/lib/services/cooperation';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const data = await getCooperationWorkspace(user, params.id); return ok(data); }
  catch (e) { return handleError(e); }
}
