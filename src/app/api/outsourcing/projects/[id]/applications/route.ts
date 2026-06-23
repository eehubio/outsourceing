import { requireUser } from '@/lib/auth/session';
import { listForProject, createApplication } from '@/lib/services/application';
import { createApplicationSchema } from '@/lib/schemas';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try { const user = await requireUser(); const applications = await listForProject(user, params.id); return ok({ applications }); }
  catch (e) { return handleError(e); }
}
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = createApplicationSchema.parse(await req.json());
    const application = await createApplication(user, params.id, body);
    return ok({ application }, 201);
  } catch (e) { return handleError(e); }
}
