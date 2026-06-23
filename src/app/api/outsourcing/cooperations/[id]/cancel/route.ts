import { requireUser } from '@/lib/auth/session';
import { cancelCooperation } from '@/lib/services/cooperation';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const r = await cancelCooperation(user, params.id); return ok(r); }
  catch (e) { return handleError(e); }
}
