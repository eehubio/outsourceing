import { requireUser } from '@/lib/auth/session';
import { sendMessage } from '@/lib/services/conversation';
import { messageSchema } from '@/lib/schemas';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: { applicationId: string } }) {
  try { const user = await requireUser(); const { body, kind } = messageSchema.parse(await req.json()); const message = await sendMessage(user, params.applicationId, body, kind); return ok({ message }, 201); }
  catch (e) { return handleError(e); }
}
