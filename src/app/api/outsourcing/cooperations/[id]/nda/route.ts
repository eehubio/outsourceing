import { requireUser } from '@/lib/auth/session';
import { confirmNda } from '@/lib/services/cooperation';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const cooperation = await confirmNda(user, params.id); return ok({ cooperation }); }
  catch (e) { return handleError(e); }
}
