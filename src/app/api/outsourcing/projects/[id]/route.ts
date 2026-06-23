import { requireUser, getSessionUser } from '@/lib/auth/session';
import { getRepo } from '@/lib/repo';
import { updateProjectSchema } from '@/lib/schemas';
import { updateProject, viewProjectFor } from '@/lib/services/project';
import { ok, handleError } from '@/lib/api';
import { HttpError } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    const project = await getRepo().getProject(params.id);
    if (!project) throw new HttpError(404, '项目不存在');
    const view = await viewProjectFor(user, project);
    return ok({ project: view });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = updateProjectSchema.parse(await req.json());
    const project = await updateProject(user, params.id, body);
    return ok({ project });
  } catch (e) { return handleError(e); }
}
