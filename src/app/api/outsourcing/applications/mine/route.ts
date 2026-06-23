import { requireUser } from '@/lib/auth/session';
import { listMine } from '@/lib/services/application';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { const user = await requireUser(); const applications = await listMine(user); return ok({ applications }); }
  catch (e) { return handleError(e); }
}
