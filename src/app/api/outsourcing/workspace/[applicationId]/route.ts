import { requireUser } from '@/lib/auth/session';
import { getWorkspace } from '@/lib/services/conversation';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: { applicationId: string } }) {
  try { const user = await requireUser(); const data = await getWorkspace(user, params.applicationId); return ok(data); }
  catch (e) { return handleError(e); }
}
