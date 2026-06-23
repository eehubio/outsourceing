import { requireUser } from '@/lib/auth/session';
import { getApplicationGuarded, updateApplication } from '@/lib/services/application';
import { applicationProposalSchema } from '@/lib/schemas';
import { z } from 'zod';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
const patchSchema = z.object({ proposal: applicationProposalSchema.optional(), quote: z.string().optional(), durationText: z.string().optional(), validUntil: z.string().optional() });
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const application = await getApplicationGuarded(user, params.id); return ok({ application }); }
  catch (e) { return handleError(e); }
}
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const body = patchSchema.parse(await req.json()); const application = await updateApplication(user, params.id, body); return ok({ application }); }
  catch (e) { return handleError(e); }
}
