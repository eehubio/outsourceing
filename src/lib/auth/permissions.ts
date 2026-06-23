import { getRepo } from '../repo';
import type { SessionUser } from './session';
import { HttpError } from './session';

const repo = () => getRepo();

export async function isProjectOwner(user: SessionUser, projectId: string): Promise<boolean> {
  const project = await repo().getProject(projectId);
  if (!project) return false;
  if (project.creatorId === user.id) return true;
  const membership = await repo().getOrgMember(project.orgId, user.id);
  return !!membership;
}

export function isReviewer(user: SessionUser): boolean {
  return user.platformRole === 'REVIEWER' || user.platformRole === 'ADMIN';
}

export async function isApplicant(user: SessionUser, applicationId: string): Promise<boolean> {
  const app = await repo().getApplication(applicationId);
  return !!app && app.applicantId === user.id;
}

export async function canAccessConversation(user: SessionUser, conversationId: string): Promise<boolean> {
  const conv = await repo().getConversation(conversationId);
  if (!conv) return false;
  if (conv.participants.some((p: { userId: string }) => p.userId === user.id)) return true;
  const app = await repo().getApplication(conv.applicationId);
  if (app && app.applicantId === user.id) return true;
  if (app && (await isProjectOwner(user, app.projectId))) return true;
  if (isReviewer(user)) return true;
  return false;
}

export async function roleInProject(
  user: SessionUser,
  projectId: string,
  applicantId?: string,
): Promise<'publisher' | 'provider' | 'reviewer' | 'admin' | null> {
  if (user.platformRole === 'ADMIN') return 'admin';
  if (await isProjectOwner(user, projectId)) return 'publisher';
  if (applicantId && user.id === applicantId) return 'provider';
  if (isReviewer(user)) return 'reviewer';
  return null;
}

export function assert(condition: boolean, status: number, message: string): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
