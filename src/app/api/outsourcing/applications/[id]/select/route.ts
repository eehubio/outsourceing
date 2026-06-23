import { requireUser } from '@/lib/auth/session';
import { selectApplication } from '@/lib/services/application';
import { ok, handleError } from '@/lib/api';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const schema = z.object({ selected: z.boolean() });
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { selected } = schema.parse(await req.json());
    const application = await selectApplication(user, params.id, selected);
    return ok({ application });
  } catch (e) { return handleError(e); }
}
