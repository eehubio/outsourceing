import { requireUser } from '@/lib/auth/session';
import { transitionApplication } from '@/lib/services/application';
import { transitionSchema } from '@/lib/schemas';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const { event, note } = transitionSchema.parse(await req.json()); const r = await transitionApplication(user, params.id, event, note); return ok(r); }
  catch (e) { return handleError(e); }
}
