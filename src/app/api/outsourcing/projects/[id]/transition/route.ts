import { requireUser } from '@/lib/auth/session';
import { getRepo } from '@/lib/repo';
import { projectMachine } from '@/lib/state-machines/definitions';
import { next as smNext } from '@/lib/state-machines/engine';
import { roleInProject } from '@/lib/auth/permissions';
import { transitionSchema } from '@/lib/schemas';
import { ok, handleError } from '@/lib/api';
import { HttpError } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { event } = transitionSchema.parse(await req.json());
    const repo = getRepo();
    const project = await repo.getProject(params.id);
    if (!project) throw new HttpError(404, '项目不存在');
    const role = await roleInProject(user, params.id);
    if (!role) throw new HttpError(403, '无权操作');
    const to = smNext(projectMachine, project.status, event, role);
    await repo.setProjectStatus(params.id, to);
    await repo.audit(user.id, `project.${event}`, 'OutsourcingProject', params.id, { from: project.status, to });
    return ok({ from: project.status, to });
  } catch (e) { return handleError(e); }
}
