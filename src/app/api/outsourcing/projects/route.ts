import { requireUser, getSessionUser } from '@/lib/auth/session';
import { getRepo } from '@/lib/repo';
import { createProjectSchema } from '@/lib/schemas';
import { createProject, viewProjectFor } from '@/lib/services/project';
import { ok, handleError } from '@/lib/api';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope'); // plaza | mine | review
    const user = await getSessionUser();
    const repo = getRepo();
    if (scope === 'mine') {
      const u = await requireUser();
      const list = await repo.listProjects({ creatorId: u.id });
      return ok({ projects: list });
    }
    if (scope === 'review') {
      const u = await requireUser();
      if (u.platformRole !== 'REVIEWER' && u.platformRole !== 'ADMIN') return ok({ projects: [] });
      const list = await repo.listProjects({ status: 'pending_review' });
      return ok({ projects: list });
    }
    // plaza: 仅已发布，按可见性裁剪 PRD
    const list = await repo.listProjects({ publicOnly: true });
    const view = await Promise.all(list.map((p) => viewProjectFor(user, p)));
    return ok({ projects: view });
  } catch (e) { return handleError(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = createProjectSchema.parse(await req.json());
    const project = await createProject(user, body);
    return ok({ project }, 201);
  } catch (e) { return handleError(e); }
}
