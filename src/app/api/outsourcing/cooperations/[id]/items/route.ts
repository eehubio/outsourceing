import { requireUser } from '@/lib/auth/session';
import { setItemStatus } from '@/lib/services/cooperation';
import { roleInProject } from '@/lib/auth/permissions';
import { getRepo } from '@/lib/repo';
import { z } from 'zod';
import { ok, handleError } from '@/lib/api';
import { HttpError } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
const schema = z.object({ itemId: z.string() });
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { itemId } = schema.parse(await req.json());
    const coop = await getRepo().getCooperationById(params.id);
    if (!coop) throw new HttpError(404, '合作记录不存在');
    const app = await getRepo().getApplication(coop.applicationId);
    const role = await roleInProject(user, coop.projectId, app?.applicantId);
    if (role !== 'publisher' && role !== 'provider') throw new HttpError(403, '无权确认');
    const item = await setItemStatus(user, params.id, itemId, role);
    return ok({ item });
  } catch (e) { return handleError(e); }
}
