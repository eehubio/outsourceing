import type {
  User, Organization, OrganizationMember, ProviderProfile,
  OutsourcingProject, ProjectVersion, ProjectApplication,
  Conversation, Message, ClarificationQuestion,
  CooperationConfirmation, ConfirmationItem, EzplmProjectLink,
} from './types';
import type { Prd } from '../json';

export interface ProjectQuery {
  status?: string;
  statuses?: string[];
  orgId?: string;
  creatorId?: string;
  publicOnly?: boolean; // 广场：仅 published
}

export interface Repo {
  // 身份
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(input: { email: string; name: string; passwordHash: string; accountType: string; platformRole?: string }): Promise<User>;
  listDemoUsers(): Promise<User[]>;
  getOrgMember(orgId: string, userId: string): Promise<OrganizationMember | null>;
  getUserPrimaryOrg(userId: string): Promise<Organization | null>;
  ensurePersonalOrg(userId: string, name: string): Promise<Organization>;
  getProviderProfile(userId: string): Promise<ProviderProfile | null>;
  getOrganization(id: string): Promise<Organization | null>;

  // 项目
  createProject(input: {
    creatorId: string; orgId: string; title: string; projectType: string; industry?: string;
    budgetRange: string; durationText: string; skills: string[]; tags: string[]; location: string;
    visibility: string; needNda: boolean; feeTotal: number; prd: Prd; completeness: number;
  }): Promise<OutsourcingProject>;
  getProject(id: string): Promise<OutsourcingProject | null>;
  listProjects(q: ProjectQuery): Promise<OutsourcingProject[]>;
  updateProjectFields(id: string, patch: Partial<{
    title: string; projectType: string; industry: string; budgetRange: string; durationText: string;
    skills: string[]; tags: string[]; location: string; visibility: string; needNda: boolean;
    feeTotal: number; reviewNote: string | null; paid: boolean; payOrderNo: string;
  }>): Promise<OutsourcingProject>;
  setProjectStatus(id: string, status: string): Promise<OutsourcingProject>;
  softDeleteProject(id: string): Promise<void>;
  // 新建版本快照（提交审核 / 重大编辑时）
  addProjectVersion(projectId: string, prd: Prd, completeness: number, createdById: string): Promise<ProjectVersion>;
  getCurrentVersion(projectId: string): Promise<ProjectVersion | null>;

  // 申请
  createApplication(input: {
    projectId: string; versionId?: string; applicantId: string;
    proposal: ProjectApplication['proposal']; quote: string; durationText: string; validUntil?: string;
    status: string;
  }): Promise<ProjectApplication>;
  getApplication(id: string): Promise<ProjectApplication | null>;
  getApplicationByProjectUser(projectId: string, userId: string): Promise<ProjectApplication | null>;
  listApplicationsForProject(projectId: string): Promise<ProjectApplication[]>;
  listApplicationsByUser(userId: string): Promise<ProjectApplication[]>;
  updateApplicationFields(id: string, patch: Partial<{
    proposal: ProjectApplication['proposal']; quote: string; durationText: string; validUntil: string;
  }>): Promise<ProjectApplication>;
  setApplicationStatus(id: string, status: string, actorId: string, note?: string): Promise<ProjectApplication>;
  setApplicationSelected(id: string, selected: boolean): Promise<ProjectApplication>;

  // 对话 / 消息 / 澄清
  ensureConversation(applicationId: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  getConversationByApplication(applicationId: string): Promise<Conversation | null>;
  listMessages(conversationId: string): Promise<Message[]>;
  addMessage(conversationId: string, senderId: string, body: string, kind: string): Promise<Message>;
  listClarifications(conversationId: string): Promise<ClarificationQuestion[]>;
  getClarification(id: string): Promise<ClarificationQuestion | null>;
  addClarification(conversationId: string, askedById: string, question: string, affectsScope: boolean): Promise<ClarificationQuestion>;
  answerClarification(id: string, answeredById: string, answer: string, status: string): Promise<ClarificationQuestion>;

  // 合作确认
  ensureCooperation(projectId: string, applicationId: string, ndaRequired: boolean, summary: Record<string, unknown>): Promise<CooperationConfirmation>;
  resetCooperation(id: string, applicationId: string, ndaRequired: boolean, summary: Record<string, unknown>): Promise<CooperationConfirmation>;
  getCooperation(projectId: string): Promise<CooperationConfirmation | null>;
  getCooperationById(id: string): Promise<CooperationConfirmation | null>;
  setCooperationStatus(id: string, status: string, side?: 'publisher' | 'provider'): Promise<CooperationConfirmation>;
  setNdaSigned(id: string, side: 'publisher' | 'provider', version: string): Promise<CooperationConfirmation>;
  listConfirmationItems(cooperationId: string): Promise<ConfirmationItem[]>;
  addConfirmationItem(cooperationId: string, label: string, value?: string): Promise<ConfirmationItem>;
  setConfirmationItemStatus(id: string, status: string): Promise<ConfirmationItem>;

  // ezPLM 链接
  getEzplmLink(projectId: string): Promise<EzplmProjectLink | null>;
  upsertEzplmLink(projectId: string, data: Partial<EzplmProjectLink> & { idempotencyKey?: string }): Promise<EzplmProjectLink>;

  // 审计
  audit(actorId: string | null, action: string, entity: string, entityId: string, detail?: unknown): Promise<void>;
}
