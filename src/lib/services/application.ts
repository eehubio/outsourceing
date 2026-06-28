import { getRepo } from '../repo';
import { applicationMachine } from '../state-machines/definitions';
import { next as smNext } from '../state-machines/engine';
import { isProjectOwner, isReviewer, assert, roleInProject } from '../auth/permissions';
import type { SessionUser } from '../auth/session';
import { HttpError } from '../auth/session';
import type { ApplicationProposal } from '../repo/types';

const repo = () => getRepo();

export async function createApplication(user: SessionUser, projectId: string, input: {
  proposal: ApplicationProposal; quote: string; durationText: string; validUntil?: string;
}) {
  const project = await repo().getProject(projectId);
  assert(!!project, 404, '项目不存在');
  // 平台审核员/管理员不参与承接申请
  assert(!isReviewer(user), 403, '平台审核员/管理员不可提交承接申请');
  assert(project!.status === 'published', 409, '该项目未在招募中，暂不可申请');
  // 不能申请自己发布的项目
  assert(!(await isProjectOwner(user, projectId)), 403, '不能申请自己发布的项目');
  const dup = await repo().getApplicationByProjectUser(projectId, user.id);
  assert(!dup, 409, '您已申请过该项目');

  const version = await repo().getCurrentVersion(projectId);
  const app = await repo().createApplication({
    projectId, versionId: version?.id, applicantId: user.id,
    proposal: input.proposal, quote: input.quote, durationText: input.durationText, validUntil: input.validUntil,
    status: 'submitted',
  });
  await repo().ensureConversation(app.id);
  await repo().audit(user.id, 'application.submit', 'ProjectApplication', app.id, { projectId });
  return app;
}

export async function updateApplication(user: SessionUser, id: string, patch: {
  proposal?: ApplicationProposal; quote?: string; durationText?: string; validUntil?: string;
}) {
  const app = await repo().getApplication(id);
  assert(!!app, 404, '申请不存在');
  assert(app!.applicantId === user.id, 403, '只能修改自己的申请');
  assert(['draft', 'submitted', 'under_discussion'].includes(app!.status), 409, '当前状态不可修改');
  const fields: Record<string, unknown> = {};
  for (const k of ['proposal', 'quote', 'durationText', 'validUntil'] as const) {
    if (patch[k] !== undefined) fields[k] = patch[k];
  }
  const updated = await repo().updateApplicationFields(id, fields);
  await repo().audit(user.id, 'application.update', 'ProjectApplication', id);
  return updated;
}

// 列表必须隔离：发布方仅看自己项目收到的；服务方仅看自己的
export async function listForProject(user: SessionUser, projectId: string) {
  assert(await isProjectOwner(user, projectId) || isReviewer(user), 403, '无权查看该项目的申请');
  return repo().listApplicationsForProject(projectId);
}
export async function listMine(user: SessionUser) {
  return repo().listApplicationsByUser(user.id);
}
export async function getApplicationGuarded(user: SessionUser, id: string) {
  const app = await repo().getApplication(id);
  assert(!!app, 404, '申请不存在');
  const owner = await isProjectOwner(user, app!.projectId);
  assert(app!.applicantId === user.id || owner || isReviewer(user), 403, '无权查看该申请');
  return app;
}

export async function transitionApplication(user: SessionUser, id: string, event: string, note?: string) {
  const app = await repo().getApplication(id);
  assert(!!app, 404, '申请不存在');
  const role = await roleInProject(user, app!.projectId, app!.applicantId);
  if (!role) throw new HttpError(403, '无权操作该申请');
  const to = smNext(applicationMachine, app!.status, event, role);
  await repo().setApplicationStatus(id, to, user.id, note);
  await repo().audit(user.id, `application.${event}`, 'ProjectApplication', id, { from: app!.status, to });
  // 接受 -> 项目进入匹配，并关闭其他候选申请
  if (to === 'accepted') {
    const project = await repo().getProject(app!.projectId);
    if (project && project.status === 'published') await repo().setProjectStatus(project.id, 'matched');
    // 一位被接受后，关闭同项目其余仍在进行中的申请（拒绝），避免多方误以为仍在竞争
    const others = await repo().listApplicationsForProject(app!.projectId);
    const TERMINAL = ['accepted', 'rejected', 'withdrawn', 'expired'];
    for (const o of others) {
      if (o.id !== id && !TERMINAL.includes(o.status)) {
        await repo().setApplicationStatus(o.id, 'rejected', user.id, '项目已选定其他承接方');
        await repo().audit(user.id, 'application.auto_reject', 'ProjectApplication', o.id, { reason: 'another_accepted', winner: id });
      }
    }
  }
  return { from: app!.status, to };
}

// 甲方多选：把申请标记/取消为"合适人选"（可多个），不影响 status 流程
export async function selectApplication(user: SessionUser, id: string, selected: boolean) {
  const app = await repo().getApplication(id);
  assert(!!app, 404, '申请不存在');
  assert(await isProjectOwner(user, app!.projectId), 403, '只有发布方可选择候选人');
  const updated = await repo().setApplicationSelected(id, selected);
  await repo().audit(user.id, selected ? 'application.select' : 'application.unselect', 'ProjectApplication', id);
  return updated;
}
