import { getRepo } from '../repo';
import { getAiService } from '../ai/service';
import { computeFee } from '../constants';
import { projectMachine } from '../state-machines/definitions';
import { next as smNext } from '../state-machines/engine';
import { isProjectOwner, isReviewer, assert, roleInProject } from '../auth/permissions';
import type { SessionUser } from '../auth/session';
import { HttpError } from '../auth/session';
import type { Prd } from '../json';
import type { OutsourcingProject } from '../repo/types';

const repo = () => getRepo();

// 项目可见性矩阵。返回裁剪后的视图；无权查看时抛 403。
//
// 可见性等级（visibility）与各身份可见内容：
//   身份判定：owner（发布方/同组织）、reviewer（审核员/管理员）、applicant（已申请）、login（已登录非以上）、guest（未登录）
//
//   未发布项目（draft/pending_review/revision_required/rejected/cancelled）：
//       仅 owner 与 reviewer 可见（含完整 PRD）；其余一律 403。
//   已发布及其后续状态（published/paused/matched/cooperation_confirming/transferred_to_ezplm/closed）：
//       owner / reviewer / applicant            → 完整 PRD
//       public                                  → 任何人完整
//       summary_login                           → 登录者摘要；游客 403
//       summary_apply（默认）                    → 登录者摘要（申请后转完整）；游客摘要
//       nda                                     → 登录者摘要（申请并签 NDA 后完整）
//       invite_only / org_only                  → 非 owner/reviewer/applicant 一律 403
const UNPUBLISHED = ['draft', 'pending_review', 'revision_required', 'rejected', 'cancelled'];

function summaryOf(prd: Prd): Prd {
  return { background: prd.background, goals: prd.goals, scenarios: prd.scenarios, skills: prd.skills, deliverables: prd.deliverables };
}

export async function viewProjectFor(user: SessionUser | null, project: OutsourcingProject) {
  const owner = user ? await isProjectOwner(user, project.id) : false;
  const reviewer = user ? isReviewer(user) : false;
  let hasApplied = false;
  if (user) hasApplied = !!(await repo().getApplicationByProjectUser(project.id, user.id));

  const privileged = owner || reviewer; // 始终可见完整内容
  const prd = project.currentVersion?.requirement ?? {};

  // 未发布：仅 owner / reviewer
  if (UNPUBLISHED.includes(project.status)) {
    assert(privileged, 403, '该项目尚未发布，无权查看');
    return { ...project, prd, fullAccess: true };
  }

  if (privileged) return { ...project, prd, fullAccess: true };
  if (project.visibility === 'public') return { ...project, prd, fullAccess: true };

  // 仅受邀 / 仅指定组织：申请者可见摘要，其余 403
  if (project.visibility === 'invite_only' || project.visibility === 'org_only') {
    assert(hasApplied, 403, '该项目仅对受邀用户可见');
    return { ...project, prd, fullAccess: true };
  }

  // 登录后才可见摘要
  if (project.visibility === 'summary_login' || project.visibility === 'nda') {
    assert(!!user, 403, '请登录后查看该项目');
  }

  // 申请后看完整（summary_apply / nda 已申请且 NDA 视图在合作阶段处理）
  if (hasApplied) return { ...project, prd, fullAccess: true };
  return { ...project, prd: summaryOf(prd), fullAccess: false };
}

export async function createProject(user: SessionUser, input: {
  title: string; projectType: string; industry?: string; budgetRange: string; durationText?: string;
  skills: string[]; tags: string[]; location: string; visibility: string; needNda: boolean; orgId?: string; prd: Prd;
}) {
  let orgId = input.orgId;
  if (orgId) {
    // 校验用户属于该组织（不能凭前端传 orgId 越权）
    const m = await repo().getOrgMember(orgId, user.id);
    assert(!!m, 403, '无权使用该组织发布');
  } else {
    // 试用阶段：用户没有组织时自动创建个人组织（不再强制先在 ezPLM 创建/加入组织）
    let org = await repo().getUserPrimaryOrg(user.id);
    if (!org) org = await repo().ensurePersonalOrg(user.id, `${user.name} 的工作空间`);
    orgId = org.id;
  }
  const completeness = (await getAiService().analyzeRequirementCompleteness(input.prd)).score;
  const fee = computeFee(input.budgetRange);
  const project = await repo().createProject({
    creatorId: user.id, orgId, title: input.title, projectType: input.projectType, industry: input.industry,
    budgetRange: input.budgetRange, durationText: input.durationText ?? '', skills: input.skills, tags: input.tags,
    location: input.location, visibility: input.visibility, needNda: input.needNda, feeTotal: fee.total,
    prd: input.prd, completeness,
  });
  await repo().audit(user.id, 'project.create', 'OutsourcingProject', project.id);
  return project;
}

// 关键修复：编辑走 update，不新建项目。保留 ID / 状态 / 支付 / 申请。
export async function updateProject(user: SessionUser, id: string, patch: {
  title?: string; projectType?: string; industry?: string; budgetRange?: string; durationText?: string;
  skills?: string[]; tags?: string[]; location?: string; visibility?: string; needNda?: boolean; prd?: Prd;
}) {
  const project = await repo().getProject(id);
  assert(!!project, 404, '项目不存在');
  assert(await isProjectOwner(user, id), 403, '只有发布方可编辑该项目');
  // 仅 draft / revision_required / rejected 可编辑内容
  assert(['draft', 'revision_required', 'rejected'].includes(project!.status), 409, `当前状态「${project!.status}」不可编辑`);

  const fields: Record<string, unknown> = {};
  for (const k of ['title', 'projectType', 'industry', 'durationText', 'location', 'visibility', 'needNda', 'skills', 'tags'] as const) {
    if (patch[k] !== undefined) fields[k] = patch[k];
  }
  if (patch.budgetRange) { fields.budgetRange = patch.budgetRange; fields.feeTotal = computeFee(patch.budgetRange).total; }
  await repo().updateProjectFields(id, fields);

  // PRD 改动 -> 新版本快照（申请关联旧版本，便于"需求已变化"提示）
  if (patch.prd) {
    const completeness = (await getAiService().analyzeRequirementCompleteness(patch.prd)).score;
    await repo().addProjectVersion(id, patch.prd, completeness, user.id);
  }
  await repo().audit(user.id, 'project.update', 'OutsourcingProject', id);
  return repo().getProject(id);
}

async function transition(user: SessionUser, id: string, event: string, note?: string) {
  const project = await repo().getProject(id);
  assert(!!project, 404, '项目不存在');
  const role = await roleInProject(user, id);
  if (!role) throw new HttpError(403, '无权操作该项目');
  const to = smNext(projectMachine, project!.status, event, role);
  await repo().setProjectStatus(id, to);
  await repo().audit(user.id, `project.${event}`, 'OutsourcingProject', id, { from: project!.status, to, note });
  return { from: project!.status, to };
}

export async function submitForReview(user: SessionUser, id: string) {
  return transition(user, id, 'submit');
}

export async function reviewProject(user: SessionUser, id: string, decision: 'approve' | 'reject' | 'request_revision', note?: string) {
  assert(isReviewer(user), 403, '只有审核员可审核');
  if (decision === 'reject' && !note?.trim()) throw new HttpError(422, '驳回需填写原因');
  // 审核前要求已支付
  const project = await repo().getProject(id);
  assert(!!project, 404, '项目不存在');
  // 试用阶段：免费发布，暂不校验是否已支付（后期恢复 assert(project!.paid)）
  if (note) await repo().updateProjectFields(id, { reviewNote: note });
  return transition(user, id, decision, note);
}

export async function deleteProject(user: SessionUser, id: string) {
  const project = await repo().getProject(id);
  assert(!!project, 404, '项目不存在');
  // 审核员/管理员可删除任意项目；发布方可删除自己的项目
  const allowed = isReviewer(user) || (await isProjectOwner(user, id));
  assert(allowed, 403, '无权删除该项目');
  await repo().softDeleteProject(id);
  await repo().audit(user.id, 'project.delete', 'OutsourcingProject', id, { status: project!.status });
  return { ok: true };
}

export async function payProject(user: SessionUser, id: string, method: string) {
  const project = await repo().getProject(id);
  assert(!!project, 404, '项目不存在');
  assert(await isProjectOwner(user, id), 403, '只有发布方可支付');
  assert(!project!.paid, 409, '该项目已支付');
  // 模拟支付：内植时替换为真实网关回调
  const orderNo = 'PAY' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  await repo().updateProjectFields(id, { paid: true, payOrderNo: orderNo });
  await repo().audit(user.id, 'project.pay', 'OutsourcingProject', id, { method, orderNo });
  return { orderNo };
}
