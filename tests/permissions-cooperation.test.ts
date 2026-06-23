// 权限与合作流程集成测试（memory 后端，直接调用 service 层）
import { describe, it, expect, beforeEach } from 'vitest';

process.env.DATA_BACKEND = 'memory';

import { getRepo } from '@/lib/repo';
import { viewProjectFor, createProject, submitForReview, reviewProject, payProject } from '@/lib/services/project';
import { createApplication, transitionApplication, getApplicationGuarded, listForProject } from '@/lib/services/application';
import { addClarification, answerClarification } from '@/lib/services/conversation';
import { startCooperation, confirmCooperation, cancelCooperation, confirmNda, transferToEzplm, setItemStatus } from '@/lib/services/cooperation';
import type { SessionUser } from '@/lib/auth/session';

const repo = getRepo();
const pub: SessionUser = { id: 'u_pub1', name: '杨阳', email: 'pub@seeed.demo', platformRole: 'USER', accountType: 'publisher' };
const prov1: SessionUser = { id: 'u_prov1', name: '蒋吴琦', email: 'eng1@demo', platformRole: 'USER', accountType: 'provider' };
const prov2: SessionUser = { id: 'u_prov2', name: 'cly', email: 'studio@demo', platformRole: 'USER', accountType: 'provider' };
const rev: SessionUser = { id: 'u_rev', name: '审核员', email: 'reviewer@ezplm.demo', platformRole: 'REVIEWER', accountType: 'platform' };

const basePrd = { background: '背景', goals: '目标', functional: '功能详细描述若干', performance: '指标', interfaces: '接口', budget: '1-5万', duration: '6周', contractorWork: '工作', acceptance: '验收', deliverables: ['源码'] };

async function publishedProject(needNda = false) {
  const p = await createProject(pub, { title: '测试项目', projectType: 'firmware', budgetRange: '1-5万', skills: [], tags: [], location: '远程', visibility: 'summary_apply', needNda, prd: basePrd } as any);
  await payProject(pub, p.id, 'wechat');
  await submitForReview(pub, p.id);
  await reviewProject(rev, p.id, 'approve');
  return p.id;
}
async function acceptedApp(projectId: string, who: SessionUser) {
  const a = await createApplication(who, projectId, { proposal: { approach: 'x' }, quote: '2万', durationText: '6周' } as any);
  await transitionApplication(pub, a.id, 'shortlist');
  await transitionApplication(pub, a.id, 'invite');
  await transitionApplication(who, a.id, 'accept');
  return a.id;
}

describe('可见性矩阵', () => {
  it('未发布项目对非 owner 返回 403', async () => {
    const p = await createProject(pub, { title: '草稿项目', projectType: 'firmware', budgetRange: '1-5万', skills: [], tags: [], location: '远程', visibility: 'summary_apply', needNda: false, prd: basePrd } as any);
    const proj = await repo.getProject(p.id);
    await expect(viewProjectFor(prov1, proj!)).rejects.toMatchObject({ status: 403 });
  });
  it('未发布项目 owner 可见完整', async () => {
    const p = await createProject(pub, { title: '草稿项目2', projectType: 'firmware', budgetRange: '1-5万', skills: [], tags: [], location: '远程', visibility: 'summary_apply', needNda: false, prd: basePrd } as any);
    const proj = await repo.getProject(p.id);
    const v = await viewProjectFor(pub, proj!);
    expect(v.fullAccess).toBe(true);
  });
  it('已发布 summary_apply：未申请者只见摘要', async () => {
    const id = await publishedProject();
    const proj = await repo.getProject(id);
    const v = await viewProjectFor(prov1, proj!);
    expect(v.fullAccess).toBe(false);
    expect(v.prd.functional).toBeUndefined();
  });
  it('invite_only：未申请者 403', async () => {
    const p = await createProject(pub, { title: '受邀项目', projectType: 'firmware', budgetRange: '1-5万', skills: [], tags: [], location: '远程', visibility: 'invite_only', needNda: false, prd: basePrd } as any);
    await payProject(pub, p.id, 'wechat'); await submitForReview(pub, p.id); await reviewProject(rev, p.id, 'approve');
    const proj = await repo.getProject(p.id);
    await expect(viewProjectFor(prov1, proj!)).rejects.toMatchObject({ status: 403 });
  });
});

describe('申请越权', () => {
  it('非发布方不能列出项目申请', async () => {
    const id = await publishedProject();
    await expect(listForProject(prov1, id)).rejects.toMatchObject({ status: 403 });
  });
  it('服务方不能读他人申请', async () => {
    const id = await publishedProject();
    const appId = await createApplication(prov1, id, { proposal: {}, quote: '1万', durationText: '4周' } as any).then((a) => a.id);
    await expect(getApplicationGuarded(prov2, appId)).rejects.toMatchObject({ status: 403 });
  });
});

describe('clarification 跨对话越权', () => {
  it('不能用 A 对话的权限回答 B 对话的问题', async () => {
    const idA = await publishedProject();
    const idB = await publishedProject();
    const appA = await createApplication(prov1, idA, { proposal: {}, quote: '1万', durationText: '4周' } as any);
    const appB = await createApplication(prov2, idB, { proposal: {}, quote: '1万', durationText: '4周' } as any);
    // 在 B 对话提一个问题
    const qB = await addClarification(prov2, appB.id, 'B 的问题', false);
    // prov1 是 A 的参与者，但尝试用 A 的 applicationId 去回答 B 的问题
    await expect(answerClarification(prov1, appA.id, qB.id, '越权回答', 'answered')).rejects.toMatchObject({ status: 404 });
  });
});

describe('一位 accepted 后关闭其他候选', () => {
  it('其余进行中申请被自动拒绝', async () => {
    const id = await publishedProject();
    const a1 = await createApplication(prov1, id, { proposal: {}, quote: '2万', durationText: '6周' } as any);
    const a2 = await createApplication(prov2, id, { proposal: {}, quote: '3万', durationText: '6周' } as any);
    await transitionApplication(pub, a1.id, 'shortlist');
    await transitionApplication(pub, a1.id, 'invite');
    await transitionApplication(prov1, a1.id, 'accept');
    const after2 = await repo.getApplication(a2.id);
    expect(after2!.status).toBe('rejected');
  });
});

describe('合作确认强制逐项确认', () => {
  it('未逐项确认时 confirmCooperation 抛 409', async () => {
    const id = await publishedProject();
    const appId = await acceptedApp(id, prov1);
    const coop = await startCooperation(pub, id, appId);
    await expect(confirmCooperation(pub, coop.id)).rejects.toMatchObject({ status: 409 });
  });
  it('逐项双方确认后可完成合作确认', async () => {
    const id = await publishedProject();
    const appId = await acceptedApp(id, prov1);
    const coop = await startCooperation(pub, id, appId);
    const items = await repo.listConfirmationItems(coop.id);
    for (const it of items) { await setItemStatus(pub, coop.id, it.id, 'publisher'); await setItemStatus(prov1, coop.id, it.id, 'provider'); }
    const r1 = await confirmCooperation(pub, coop.id);
    expect(r1.to).toBe('publisher_confirmed');
    const r2 = await confirmCooperation(prov1, coop.id);
    expect(r2.to).toBe('both_confirmed');
  });
});

describe('NDA 双方分别确认', () => {
  it('仅一方确认 NDA 不足以转入；双方确认后可转入', async () => {
    const id = await publishedProject(true);
    const appId = await acceptedApp(id, prov1);
    const coop = await startCooperation(pub, id, appId);
    const items = await repo.listConfirmationItems(coop.id);
    for (const it of items) { await setItemStatus(pub, coop.id, it.id, 'publisher'); await setItemStatus(prov1, coop.id, it.id, 'provider'); }
    await confirmCooperation(pub, coop.id);
    await confirmCooperation(prov1, coop.id);
    // 仅发布方确认 NDA
    await confirmNda(pub, coop.id);
    await expect(transferToEzplm(pub, coop.id)).rejects.toMatchObject({ status: 409 });
    // 服务方也确认 NDA
    await confirmNda(prov1, coop.id);
    const r = await transferToEzplm(pub, coop.id);
    expect(r.link.ezplmProjectId).toBeTruthy();
  });
});

describe('取消合作后重新选择另一服务方', () => {
  it('取消后原申请被拒、项目回到 published，可接受另一申请并重建合作', async () => {
    const id = await publishedProject();
    const a1 = await createApplication(prov1, id, { proposal: {}, quote: '2万', durationText: '6周' } as any);
    const a2 = await createApplication(prov2, id, { proposal: {}, quote: '3万', durationText: '6周' } as any);
    await transitionApplication(pub, a1.id, 'shortlist');
    await transitionApplication(pub, a1.id, 'invite');
    await transitionApplication(prov1, a1.id, 'accept'); // a2 被自动拒绝
    const coop = await startCooperation(pub, id, a1.id);
    await cancelCooperation(pub, coop.id);
    const p = await repo.getProject(id);
    expect(p!.status).toBe('published');
    const a1after = await repo.getApplication(a1.id);
    expect(a1after!.status).toBe('rejected');
    // a2 此前在 a1 被接受时已自动拒绝；现在重新邀请 a2（rejected -> invited -> accepted）
    await transitionApplication(pub, a2.id, 'invite');
    await transitionApplication(prov2, a2.id, 'accept');
    const coop2 = await startCooperation(pub, id, a2.id);
    expect(coop2.status).toBe('not_started');
    expect(coop2.applicationId).toBe(a2.id);
  });
});
