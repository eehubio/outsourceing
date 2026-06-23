import { requireUser } from '@/lib/auth/session';
import { addClarification, answerClarification } from '@/lib/services/conversation';
import { clarificationSchema, answerClarificationSchema } from '@/lib/schemas';
import { z } from 'zod';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: { applicationId: string } }) {
  try { const user = await requireUser(); const { question, affectsScope } = clarificationSchema.parse(await req.json()); const q = await addClarification(user, params.applicationId, question, affectsScope); return ok({ clarification: q }, 201); }
  catch (e) { return handleError(e); }
}
const answerWithId = answerClarificationSchema.extend({ clarificationId: z.string() });
export async function PATCH(req: Request, { params }: { params: { applicationId: string } }) {
  try { const user = await requireUser(); const { clarificationId, answer, status } = answerWithId.parse(await req.json()); const q = await answerClarification(user, params.applicationId, clarificationId, answer, status); return ok({ clarification: q }); }
  catch (e) { return handleError(e); }
}
