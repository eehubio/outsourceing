import { getRepo } from '../repo';
import { cooperationMachine } from '../state-machines/definitions';
import { next as smNext } from '../state-machines/engine';
import { assert, roleInProject, isProjectOwner } from '../auth/permissions';
import type { SessionUser } from '../auth/session';
import { HttpError } from '../auth/session';
import { getEzplmService } from '../ezplm/service';

const repo = () => getRepo();

// 发布方对某个已接受的申请发起合作确认
export async function startCooperation(user: SessionUser, projectId: string, applicationId: string) {
  const project = await repo().getProject(projectId);
  assert(!!project, 404, '项目不存在');
  assert(await isProjectOwner(user, projectId), 403, '只有发布方可发起合作确认');
  const app = await repo().getApplication(applicationId);
  assert(!!app && app.projectId === projectId, 404, '申请不存在');
  assert(app!.status === 'accepted', 409, '该申请尚未被接受');

  const version = await repo().getCurrentVersion(projectId);
  const prd = (version?.requirement ?? {}) as Record<string, unknown>;
  const summary = {
    projectTitle: project!.title,
    scope: prd.contractorWork ?? '',
    outOfScope: prd.outOfScope ?? '',
    deliverables: prd.deliverables ?? [],
    budget: app!.quote || project!.budgetRange,
    duration: app!.durationText || project!.durationText,
    ip: prd.ip ?? '',
    confidentiality: prd.confidentiality ?? '',
  };
  let coop = await repo().ensureCooperation(projectId, applicationId, project!.needNda, summary);
  // 重新选择服务方：若已存在的合作记录指向其他申请，或此前已取消，则重置后复用
  if (coop.applicationId !== applicationId || coop.status === 'cancelled') {
    coop = await repo().resetCooperation(coop.id, applicationId, project!.needNda, summary);
  }
  // 项目状态推进到 cooperation_confirming（若还在 matched）
  if (project!.status === 'matched') await repo().setProjectStatus(projectId, 'cooperation_confirming');
  // 预置待确认事项
  const existing = await repo().listConfirmationItems(coop.id);
  if (existing.length === 0) {
    for (const [label, value] of [
      ['最终项目范围', String(summary.scope || '')],
      ['预算', String(summary.budget || '')],
      ['周期', String(summary.duration || '')],
      ['交付物', Array.isArray(summary.deliverables) ? (summary.deliverables as string[]).join('、') : ''],
      ['知识产权', String(summary.ip || '')],
      ['保密要求', String(summary.confidentiality || '')],
    ] as [string, string][]) {
      await repo().addConfirmationItem(coop.id, label, value);
    }
  }
  await repo().audit(user.id, 'cooperation.start', 'CooperationConfirmation', coop.id);
  return coop;
}

export async function getCooperationWorkspace(user: SessionUser, cooperationId: string) {
  const coop = await repo().getCooperationById(cooperationId);
  assert(!!coop, 404, '合作记录不存在');
  const app = await repo().getApplication(coop!.applicationId);
  const role = await roleInProject(user, coop!.projectId, app?.applicantId);
  assert(role === 'publisher' || role === 'provider' || role === 'admin', 403, '无权查看');
  const [items, project, link] = await Promise.all([
    repo().listConfirmationItems(cooperationId),
    repo().getProject(coop!.projectId),
    repo().getEzplmLink(coop!.projectId),
  ]);
  return { cooperation: coop, application: app, items, project, ezplmLink: link, myRole: role };
}

export async function confirmCooperation(user: SessionUser, cooperationId: string) {
  const coop = await repo().getCooperationById(cooperationId);
  assert(!!coop, 404, '合作记录不存在');
  const app = await repo().getApplication(coop!.applicationId);
  const role = await roleInProject(user, coop!.projectId, app?.applicantId);
  if (role !== 'publisher' && role !== 'provider') throw new HttpError(403, '只有合作双方可确认');

  // 强制：本方确认前，所有待确认事项必须已由双方逐项确认（both_confirmed）。
  // 这样"确认合作"才真正代表对范围/预算/周期/交付/IP/保密的逐项共识。
  const items = await repo().listConfirmationItems(cooperationId);
  const unresolved = items.filter((i) => i.status !== 'both_confirmed');
  assert(unresolved.length === 0, 409, `还有 ${unresolved.length} 项待双方逐项确认：${unresolved.map((i) => i.label).join('、')}`);

  const event = role === 'publisher' ? 'publisher_confirm' : 'provider_confirm';
  const to = smNext(cooperationMachine, coop!.status, event, role);
  await repo().setCooperationStatus(cooperationId, to, role === 'publisher' ? 'publisher' : 'provider');
  await repo().audit(user.id, `cooperation.${event}`, 'CooperationConfirmation', cooperationId, { from: coop!.status, to });
  return { from: coop!.status, to };
}

export async function cancelCooperation(user: SessionUser, cooperationId: string) {
  const coop = await repo().getCooperationById(cooperationId);
  assert(!!coop, 404, '合作记录不存在');
  const app = await repo().getApplication(coop!.applicationId);
  const role = await roleInProject(user, coop!.projectId, app?.applicantId);
  if (role !== 'publisher' && role !== 'provider') throw new HttpError(403, '只有合作双方可取消');
  const to = smNext(cooperationMachine, coop!.status, 'cancel', role);
  await repo().setCooperationStatus(cooperationId, to);
  // 取消后：把原本已接受的申请置为 rejected，项目退回 published，
  // 发布方即可从其余候选中重新选择另一服务方。
  if (app && app.status === 'accepted') {
    await repo().setApplicationStatus(app.id, 'rejected', user.id, '合作已取消');
  }
  await repo().setProjectStatus(coop!.projectId, 'published');
  await repo().audit(user.id, 'cooperation.cancel', 'CooperationConfirmation', cooperationId, { reopenedProject: coop!.projectId });
  return { to };
}

export async function setItemStatus(user: SessionUser, cooperationId: string, itemId: string, side: 'publisher' | 'provider') {
  const coop = await repo().getCooperationById(cooperationId);
  assert(!!coop, 404, '合作记录不存在');
  const app = await repo().getApplication(coop!.applicationId);
  const role = await roleInProject(user, coop!.projectId, app?.applicantId);
  assert(role === side, 403, '无权确认该事项');
  const items = await repo().listConfirmationItems(cooperationId);
  const item = items.find((i) => i.id === itemId);
  assert(!!item, 404, '确认项不存在');
  // 简单合流：一方确认 -> *_confirmed；两方都确认 -> both_confirmed
  let to = item!.status;
  if (side === 'publisher') to = item!.status === 'provider_confirmed' ? 'both_confirmed' : 'publisher_confirmed';
  else to = item!.status === 'publisher_confirmed' ? 'both_confirmed' : 'provider_confirmed';
  const updated = await repo().setConfirmationItemStatus(itemId, to);
  await repo().audit(user.id, 'cooperation.item_confirm', 'ConfirmationItem', itemId, { to });
  return updated;
}

// 双方确认后转入 ezPLM（幂等）
export async function transferToEzplm(user: SessionUser, cooperationId: string) {
  const coop = await repo().getCooperationById(cooperationId);
  assert(!!coop, 404, '合作记录不存在');
  assert(await isProjectOwner(user, coop!.projectId), 403, '只有发布方可创建 ezPLM 项目');

  // 幂等：已成功转入则直接返回（放在状态断言之前，支持重复调用）
  const existing = await repo().getEzplmLink(coop!.projectId);
  if (existing?.syncStatus === 'success' && existing.ezplmProjectId) {
    return { link: existing, alreadyDone: true };
  }

  assert(coop!.status === 'both_confirmed', 409, '需双方都确认后才能转入 ezPLM');
  if (coop!.ndaRequired && !coop!.ndaSignedAt) throw new HttpError(409, '该项目要求先确认 NDA');

  const project = await repo().getProject(coop!.projectId);
  const app = await repo().getApplication(coop!.applicationId);
  const version = await repo().getCurrentVersion(coop!.projectId);
  const items = await repo().listConfirmationItems(cooperationId);

  const idempotencyKey = `coop:${cooperationId}`;
  await repo().upsertEzplmLink(coop!.projectId, { syncStatus: 'syncing', idempotencyKey, createdById: user.id });
  try {
    const svc = getEzplmService();
    const result = await svc.createProjectFromOutsourcing({
      outsourcingProjectId: project!.id,
      title: project!.title,
      summary: String((coop!.summary as Record<string, unknown>).scope ?? ''),
      requirement: version?.requirement ?? {},
      publisherOrgId: project!.orgId,
      providerUserId: app!.applicantId,
      projectType: project!.projectType,
      budget: String((coop!.summary as Record<string, unknown>).budget ?? project!.budgetRange),
      duration: String((coop!.summary as Record<string, unknown>).duration ?? project!.durationText),
      deliverables: (version?.requirement?.deliverables ?? []) as string[],
      skills: project!.skills,
      confirmedItems: items.map((i) => ({ label: i.label, value: i.value })),
      applicationId: app!.id,
      idempotencyKey,
    });
    const link = await repo().upsertEzplmLink(coop!.projectId, {
      ezplmOrgId: result.ezplmOrgId, ezplmProjectId: result.ezplmProjectId, link: result.link,
      syncStatus: result.status, syncError: result.error ?? null,
    });
    // 状态推进：合作 transferred + 项目 transferred_to_ezplm
    await repo().setCooperationStatus(cooperationId, smNext(cooperationMachine, coop!.status, 'transfer', 'publisher'));
    await repo().setProjectStatus(coop!.projectId, 'transferred_to_ezplm');
    await repo().audit(user.id, 'cooperation.transfer', 'CooperationConfirmation', cooperationId, { ezplmProjectId: result.ezplmProjectId });
    return { link, alreadyDone: false };
  } catch (e) {
    await repo().upsertEzplmLink(coop!.projectId, { syncStatus: 'failed', syncError: (e as Error).message });
    throw new HttpError(502, 'ezPLM 同步失败：' + (e as Error).message);
  }
}

export async function confirmNda(user: SessionUser, cooperationId: string) {
  const coop = await repo().getCooperationById(cooperationId);
  assert(!!coop, 404, '合作记录不存在');
  const app = await repo().getApplication(coop!.applicationId);
  const role = await roleInProject(user, coop!.projectId, app?.applicantId);
  assert(role === 'publisher' || role === 'provider', 403, '只有合作双方可确认 NDA');
  const updated = await repo().setNdaSigned(cooperationId, role, 'v1-offline');
  await repo().audit(user.id, 'cooperation.nda_signed', 'CooperationConfirmation', cooperationId, { side: role });
  return updated;
}
