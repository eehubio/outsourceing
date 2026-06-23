import { requireUser } from '@/lib/auth/session';
import { startCooperation } from '@/lib/services/cooperation';
import { z } from 'zod';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
const schema = z.object({ projectId: z.string(), applicationId: z.string() });
export async function POST(req: Request) {
  try { const user = await requireUser(); const { projectId, applicationId } = schema.parse(await req.json()); const cooperation = await startCooperation(user, projectId, applicationId); return ok({ cooperation }, 201); }
  catch (e) { return handleError(e); }
}
