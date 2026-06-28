// Prisma 适配器（生产）。实现与 memory 适配器完全一致的 Repo 接口。
// 仅当 DATA_BACKEND=prisma 时由工厂延迟加载；需可用数据库与已生成的 Prisma 引擎。
import { prisma } from '../prisma';
import type { Repo, ProjectQuery } from './types-repo';
import type * as T from './types';
import type { Prd } from '../json';
import { parseJson, toJson } from '../json';

const now = () => new Date().toISOString();
const arr = (s: string) => parseJson<string[]>(s, []);

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProject(p: any, version?: any, counts?: { applicationCount: number; acceptedCount: number }): T.OutsourcingProject {
  return {
    id: p.id, orgId: p.orgId, creatorId: p.creatorId, title: p.title, projectType: p.projectType,
    industry: p.industry, budgetRange: p.budgetRange, durationText: p.durationText,
    skills: arr(p.skills), tags: arr(p.tags), location: p.location, visibility: p.visibility,
    needNda: p.needNda, status: p.status, reviewNote: p.reviewNote, feeTotal: p.feeTotal,
    paid: p.paid, payOrderNo: p.payOrderNo, isDemo: p.isDemo,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString?.() ?? String(p.deletedAt) : null,
    createdAt: p.createdAt.toISOString?.() ?? String(p.createdAt),
    updatedAt: p.updatedAt.toISOString?.() ?? String(p.updatedAt),
    currentVersion: version ? mapVersion(version) : undefined,
    applicationCount: counts?.applicationCount,
    acceptedCount: counts?.acceptedCount,
  };
}
function mapVersion(v: any): T.ProjectVersion {
  return { id: v.id, projectId: v.projectId, versionNo: v.versionNo, requirement: parseJson<Prd>(v.requirement, {}), completeness: v.completeness, createdById: v.createdById, createdAt: v.createdAt.toISOString?.() ?? String(v.createdAt) };
}
function mapApp(a: any): T.ProjectApplication {
  return {
    id: a.id, projectId: a.projectId, versionId: a.versionId, applicantId: a.applicantId,
    proposal: parseJson(a.proposal, {}), quote: a.quote, durationText: a.durationText, validUntil: a.validUntil,
    status: a.status, selected: a.selected ?? false, isDemo: a.isDemo, deletedAt: a.deletedAt ? String(a.deletedAt) : null,
    createdAt: a.createdAt.toISOString?.() ?? String(a.createdAt), updatedAt: a.updatedAt.toISOString?.() ?? String(a.updatedAt),
    applicantName: a.applicant?.name, applicantEmail: a.applicant?.email, projectTitle: a.project?.title,
  };
}

async function decorate(p: any): Promise<T.OutsourcingProject> {
  const version = await prisma.projectVersion.findFirst({ where: { projectId: p.id }, orderBy: { versionNo: 'desc' } });
  const apps = await prisma.projectApplication.findMany({ where: { projectId: p.id, deletedAt: null } });
  return mapProject(p, version, { applicationCount: apps.length, acceptedCount: apps.filter((a: any) => a.status === 'accepted').length });
}

export const prismaRepo: Repo = {
  async getUser(id) { const u = await prisma.user.findUnique({ where: { id } }); return u as any; },
  async getUserByEmail(email) { const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } }); return u as any; },
  async createUser(input) {
    const u = await prisma.user.create({ data: {
      email: input.email.toLowerCase(), name: input.name, passwordHash: input.passwordHash,
      accountType: input.accountType, platformRole: input.platformRole || 'USER',
    } });
    return u as any;
  },
  async listDemoUsers() { return (await prisma.user.findMany({ where: { isDemo: true } })) as any; },
  async getOrgMember(orgId, userId) { return (await prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId, userId } } })) as any; },
  async getUserPrimaryOrg(userId) {
    const m = await prisma.organizationMember.findFirst({ where: { userId }, include: { org: true } });
    return (m?.org ?? null) as any;
  },
  async ensurePersonalOrg(userId, name) {
    const existing = await prisma.organizationMember.findFirst({ where: { userId }, include: { org: true } });
    if (existing?.org) return existing.org as any;
    const org = await prisma.organization.create({ data: { name, type: 'personal' } });
    await prisma.organizationMember.create({ data: { orgId: org.id, userId, role: 'OWNER' } });
    return org as any;
  },
  async getProviderProfile(userId) {
    const p = await prisma.providerProfile.findUnique({ where: { userId } });
    if (!p) return null;
    return { ...p, languages: arr(p.languages), skills: arr(p.skills), tools: arr(p.tools) } as any;
  },
  async getOrganization(id) { return (await prisma.organization.findUnique({ where: { id } })) as any; },

  async createProject(input) {
    const p = await prisma.outsourcingProject.create({ data: {
      creatorId: input.creatorId, orgId: input.orgId, title: input.title, projectType: input.projectType,
      industry: input.industry, budgetRange: input.budgetRange, durationText: input.durationText,
      skills: toJson(input.skills), tags: toJson(input.tags), location: input.location,
      visibility: input.visibility, needNda: input.needNda, feeTotal: input.feeTotal, status: 'draft',
    } });
    await prisma.projectVersion.create({ data: { projectId: p.id, versionNo: 1, requirement: toJson(input.prd), completeness: input.completeness, createdById: input.creatorId } });
    return decorate(p);
  },
  async getProject(id) {
    const p = await prisma.outsourcingProject.findFirst({ where: { id, deletedAt: null } });
    return p ? decorate(p) : null;
  },
  async listProjects(q: ProjectQuery) {
    const where: any = { deletedAt: null };
    if (q.publicOnly) where.status = 'published';
    if (q.status) where.status = q.status;
    if (q.statuses) where.status = { in: q.statuses };
    if (q.orgId) where.orgId = q.orgId;
    if (q.creatorId) where.creatorId = q.creatorId;
    const list = await prisma.outsourcingProject.findMany({ where, orderBy: { createdAt: 'desc' } });
    return Promise.all(list.map(decorate));
  },
  async updateProjectFields(id, patch) {
    const data: any = { ...patch };
    if (patch.skills) data.skills = toJson(patch.skills);
    if (patch.tags) data.tags = toJson(patch.tags);
    const p = await prisma.outsourcingProject.update({ where: { id }, data });
    return decorate(p);
  },
  async setProjectStatus(id, status) {
    const p = await prisma.outsourcingProject.update({ where: { id }, data: { status } });
    return decorate(p);
  },
  async softDeleteProject(id) {
    await prisma.outsourcingProject.update({ where: { id }, data: { deletedAt: new Date() } });
  },
  async addProjectVersion(projectId, prd, completeness, createdById) {
    const count = await prisma.projectVersion.count({ where: { projectId } });
    const v = await prisma.projectVersion.create({ data: { projectId, versionNo: count + 1, requirement: toJson(prd), completeness, createdById } });
    return mapVersion(v);
  },
  async getCurrentVersion(projectId) {
    const v = await prisma.projectVersion.findFirst({ where: { projectId }, orderBy: { versionNo: 'desc' } });
    return v ? mapVersion(v) : null;
  },

  async createApplication(input) {
    const a = await prisma.projectApplication.create({ data: {
      projectId: input.projectId, versionId: input.versionId, applicantId: input.applicantId,
      proposal: toJson(input.proposal), quote: input.quote, durationText: input.durationText,
      validUntil: input.validUntil, status: input.status,
    }, include: { applicant: true, project: true } });
    await prisma.applicationStatusHistory.create({ data: { applicationId: a.id, toStatus: input.status, actorId: input.applicantId } });
    return mapApp(a);
  },
  async getApplication(id) {
    const a = await prisma.projectApplication.findFirst({ where: { id, deletedAt: null }, include: { applicant: true, project: true } });
    return a ? mapApp(a) : null;
  },
  async getApplicationByProjectUser(projectId, userId) {
    const a = await prisma.projectApplication.findFirst({ where: { projectId, applicantId: userId, deletedAt: null }, include: { applicant: true } });
    return a ? mapApp(a) : null;
  },
  async listApplicationsForProject(projectId) {
    const list = await prisma.projectApplication.findMany({ where: { projectId, deletedAt: null }, include: { applicant: true }, orderBy: { createdAt: 'desc' } });
    return list.map(mapApp);
  },
  async listApplicationsByUser(userId) {
    const list = await prisma.projectApplication.findMany({ where: { applicantId: userId, deletedAt: null }, include: { applicant: true, project: true }, orderBy: { createdAt: 'desc' } });
    return list.map(mapApp);
  },
  async updateApplicationFields(id, patch) {
    const data: any = { ...patch };
    if (patch.proposal) data.proposal = toJson(patch.proposal);
    const a = await prisma.projectApplication.update({ where: { id }, data, include: { applicant: true } });
    return mapApp(a);
  },
  async setApplicationStatus(id, status, actorId, note) {
    const before = await prisma.projectApplication.findUnique({ where: { id } });
    const a = await prisma.projectApplication.update({ where: { id }, data: { status }, include: { applicant: true } });
    await prisma.applicationStatusHistory.create({ data: { applicationId: id, fromStatus: before?.status, toStatus: status, actorId, note } });
    return mapApp(a);
  },
  async setApplicationSelected(id, selected) {
    const a = await prisma.projectApplication.update({ where: { id }, data: { selected }, include: { applicant: true } });
    return mapApp(a);
  },

  async ensureConversation(applicationId) {
    let c = await prisma.conversation.findUnique({ where: { applicationId }, include: { participants: true } });
    if (!c) {
      const app = await prisma.projectApplication.findUnique({ where: { id: applicationId }, include: { project: true } });
      c = await prisma.conversation.create({ data: {
        applicationId,
        participants: { create: [
          { userId: app!.project.creatorId, role: 'publisher' },
          { userId: app!.applicantId, role: 'provider' },
        ] },
      }, include: { participants: true } });
    }
    return { id: c.id, applicationId: c.applicationId, createdAt: String(c.createdAt), participants: c.participants.map((p: any) => ({ userId: p.userId, role: p.role })) };
  },
  async getConversation(id) {
    const c = await prisma.conversation.findUnique({ where: { id }, include: { participants: true } });
    if (!c) return null;
    return { id: c.id, applicationId: c.applicationId, createdAt: String(c.createdAt), participants: c.participants.map((p: any) => ({ userId: p.userId, role: p.role })) };
  },
  async getConversationByApplication(applicationId) {
    const c = await prisma.conversation.findUnique({ where: { applicationId }, include: { participants: true } });
    if (!c) return null;
    return { id: c.id, applicationId: c.applicationId, createdAt: String(c.createdAt), participants: c.participants.map((p: any) => ({ userId: p.userId, role: p.role })) };
  },
  async listMessages(conversationId) {
    const list = await prisma.message.findMany({ where: { conversationId }, include: { sender: true }, orderBy: { createdAt: 'asc' } });
    return list.map((m: any) => ({ id: m.id, conversationId: m.conversationId, senderId: m.senderId, senderName: m.sender.name, kind: m.kind, body: m.body, createdAt: String(m.createdAt) }));
  },
  async addMessage(conversationId, senderId, body, kind) {
    const m = await prisma.message.create({ data: { conversationId, senderId, body, kind }, include: { sender: true } });
    return { id: m.id, conversationId, senderId, senderName: m.sender.name, kind: m.kind, body: m.body, createdAt: String(m.createdAt) };
  },
  async listClarifications(conversationId) {
    const list = await prisma.clarificationQuestion.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
    return list.map((q: any) => ({ id: q.id, conversationId: q.conversationId, question: q.question, answer: q.answer, askedById: q.askedById, answeredById: q.answeredById, affectsScope: q.affectsScope, status: q.status, createdAt: String(q.createdAt), updatedAt: String(q.updatedAt) }));
  },
  async addClarification(conversationId, askedById, question, affectsScope) {
    const q = await prisma.clarificationQuestion.create({ data: { conversationId, askedById, question, affectsScope } });
    return { id: q.id, conversationId, question: q.question, answer: q.answer, askedById, answeredById: q.answeredById, affectsScope: q.affectsScope, status: q.status, createdAt: String(q.createdAt), updatedAt: String(q.updatedAt) };
  },
  async answerClarification(id, answeredById, answer, status) {
    const q = await prisma.clarificationQuestion.update({ where: { id }, data: { answer, answeredById, status } });
    return { id: q.id, conversationId: q.conversationId, question: q.question, answer: q.answer, askedById: q.askedById, answeredById: q.answeredById, affectsScope: q.affectsScope, status: q.status, createdAt: String(q.createdAt), updatedAt: String(q.updatedAt) };
  },
  async getClarification(id) {
    const q = await prisma.clarificationQuestion.findUnique({ where: { id } });
    if (!q) return null;
    return { id: q.id, conversationId: q.conversationId, question: q.question, answer: q.answer, askedById: q.askedById, answeredById: q.answeredById, affectsScope: q.affectsScope, status: q.status, createdAt: String(q.createdAt), updatedAt: String(q.updatedAt) };
  },

  async ensureCooperation(projectId, applicationId, ndaRequired, summary) {
    let c = await prisma.cooperationConfirmation.findUnique({ where: { projectId } });
    if (!c) c = await prisma.cooperationConfirmation.create({ data: { projectId, applicationId, ndaRequired, summary: toJson(summary) } });
    return mapCoop(c);
  },
  async resetCooperation(id, applicationId, ndaRequired, summary) {
    await prisma.confirmationItem.deleteMany({ where: { cooperationId: id } });
    const c = await prisma.cooperationConfirmation.update({ where: { id }, data: {
      applicationId, status: 'not_started', summary: toJson(summary), ndaRequired,
      publisherConfirmedAt: null, providerConfirmedAt: null,
      ndaPublisherSignedAt: null, ndaProviderSignedAt: null, ndaSignedAt: null, ndaVersion: null,
    } });
    return mapCoop(c);
  },
  async getCooperation(projectId) {
    const c = await prisma.cooperationConfirmation.findUnique({ where: { projectId } });
    return c ? mapCoop(c) : null;
  },
  async getCooperationById(id) {
    const c = await prisma.cooperationConfirmation.findUnique({ where: { id } });
    return c ? mapCoop(c) : null;
  },
  async setCooperationStatus(id, status, side) {
    const data: any = { status };
    if (side === 'publisher') data.publisherConfirmedAt = new Date();
    if (side === 'provider') data.providerConfirmedAt = new Date();
    const c = await prisma.cooperationConfirmation.update({ where: { id }, data });
    return mapCoop(c);
  },
  async setNdaSigned(id, side, version) {
    const cur = await prisma.cooperationConfirmation.findUnique({ where: { id } });
    const data: any = {};
    if (side === 'publisher') data.ndaPublisherSignedAt = new Date();
    if (side === 'provider') data.ndaProviderSignedAt = new Date();
    const pub = side === 'publisher' ? true : !!cur?.ndaPublisherSignedAt;
    const prov = side === 'provider' ? true : !!cur?.ndaProviderSignedAt;
    if (pub && prov) { data.ndaSignedAt = new Date(); data.ndaVersion = version; }
    const c = await prisma.cooperationConfirmation.update({ where: { id }, data });
    return mapCoop(c);
  },
  async listConfirmationItems(cooperationId) {
    const list = await prisma.confirmationItem.findMany({ where: { cooperationId } });
    return list.map((i: any) => ({ id: i.id, cooperationId: i.cooperationId, label: i.label, value: i.value, status: i.status }));
  },
  async addConfirmationItem(cooperationId, label, value) {
    const i = await prisma.confirmationItem.create({ data: { cooperationId, label, value } });
    return { id: i.id, cooperationId, label: i.label, value: i.value, status: i.status };
  },
  async setConfirmationItemStatus(id, status) {
    const i = await prisma.confirmationItem.update({ where: { id }, data: { status } });
    return { id: i.id, cooperationId: i.cooperationId, label: i.label, value: i.value, status: i.status };
  },

  async getEzplmLink(projectId) {
    const l = await prisma.ezplmProjectLink.findUnique({ where: { projectId } });
    return l ? mapLink(l) : null;
  },
  async upsertEzplmLink(projectId, data) {
    const l = await prisma.ezplmProjectLink.upsert({
      where: { projectId },
      create: { projectId, ...stripLink(data) },
      update: stripLink(data),
    });
    return mapLink(l);
  },

  async audit(actorId, action, entity, entityId, detail) {
    await prisma.auditLog.create({ data: { actorId, action, entity, entityId, detail: detail ? JSON.stringify(detail) : null } });
  },
};

function mapCoop(c: any): T.CooperationConfirmation {
  return { id: c.id, projectId: c.projectId, applicationId: c.applicationId, status: c.status, summary: parseJson(c.summary, {}), publisherConfirmedAt: c.publisherConfirmedAt ? String(c.publisherConfirmedAt) : null, providerConfirmedAt: c.providerConfirmedAt ? String(c.providerConfirmedAt) : null, ndaRequired: c.ndaRequired, ndaPublisherSignedAt: c.ndaPublisherSignedAt ? String(c.ndaPublisherSignedAt) : null, ndaProviderSignedAt: c.ndaProviderSignedAt ? String(c.ndaProviderSignedAt) : null, ndaSignedAt: c.ndaSignedAt ? String(c.ndaSignedAt) : null, ndaVersion: c.ndaVersion, createdAt: String(c.createdAt), updatedAt: String(c.updatedAt) };
}
function mapLink(l: any): T.EzplmProjectLink {
  return { id: l.id, projectId: l.projectId, ezplmOrgId: l.ezplmOrgId, ezplmProjectId: l.ezplmProjectId, link: l.link, syncStatus: l.syncStatus, syncError: l.syncError, idempotencyKey: l.idempotencyKey, createdById: l.createdById, createdAt: String(l.createdAt), updatedAt: String(l.updatedAt) };
}
function stripLink(data: any) {
  const { id, projectId, createdAt, updatedAt, ...rest } = data;
  return rest;
}
