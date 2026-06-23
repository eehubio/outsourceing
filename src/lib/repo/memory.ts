import type { Repo, ProjectQuery } from './types-repo';
import type * as T from './types';
import type { Prd } from '../json';
import { computeFee } from '../constants';
import { getAiService } from '../ai/service';

const now = () => new Date().toISOString();
const uid = (p: string) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

interface DB {
  users: T.User[];
  orgs: T.Organization[];
  members: T.OrganizationMember[];
  providers: T.ProviderProfile[];
  projects: T.OutsourcingProject[];
  versions: T.ProjectVersion[];
  applications: T.ProjectApplication[];
  conversations: T.Conversation[];
  messages: T.Message[];
  clarifications: T.ClarificationQuestion[];
  cooperations: T.CooperationConfirmation[];
  confItems: T.ConfirmationItem[];
  ezLinks: T.EzplmProjectLink[];
  audits: { id: string; actorId: string | null; action: string; entity: string; entityId: string; detail?: string; createdAt: string }[];
  seeded: boolean;
}

const g = globalThis as unknown as { __ezplm_db?: DB };
const db: DB = g.__ezplm_db ?? (g.__ezplm_db = {
  users: [], orgs: [], members: [], providers: [], projects: [], versions: [],
  applications: [], conversations: [], messages: [], clarifications: [],
  cooperations: [], confItems: [], ezLinks: [], audits: [], seeded: false,
});

function userName(id: string) { return db.users.find((u) => u.id === id)?.name ?? '未知用户'; }
function userEmail(id: string) { return db.users.find((u) => u.id === id)?.email ?? ''; }

async function seed() {
  if (db.seeded) return;
  db.seeded = true;

  // 用户（全部标记演示）
  const users: T.User[] = [
    { id: 'u_pub1', email: 'pub@seeed.demo', name: '杨阳', platformRole: 'USER', accountType: 'publisher', isDemo: true },
    { id: 'u_pub2', email: 'lab@uni.demo', name: '李工（高校实验室）', platformRole: 'USER', accountType: 'publisher', isDemo: true },
    { id: 'u_prov1', email: 'eng1@demo', name: '蒋吴琦', platformRole: 'USER', accountType: 'provider', isDemo: true },
    { id: 'u_prov2', email: 'studio@demo', name: 'cly（设计工作室）', platformRole: 'USER', accountType: 'provider', isDemo: true },
    { id: 'u_rev', email: 'reviewer@ezplm.demo', name: '平台审核员', platformRole: 'REVIEWER', accountType: 'platform', isDemo: true },
    { id: 'u_admin', email: 'admin@ezplm.demo', name: '平台管理员', platformRole: 'ADMIN', accountType: 'platform', isDemo: true },
  ];
  db.users.push(...users);

  const orgs: T.Organization[] = [
    { id: 'org_seeed', name: 'Seeed Studio 研发中心', type: 'company', isDemo: true },
    { id: 'org_lab', name: '某高校电子实验室', type: 'lab', isDemo: true },
    { id: 'org_studio', name: 'cly 设计工作室', type: 'studio', isDemo: true },
  ];
  db.orgs.push(...orgs);
  db.members.push(
    { id: uid('m'), orgId: 'org_seeed', userId: 'u_pub1', role: 'OWNER' },
    { id: uid('m'), orgId: 'org_lab', userId: 'u_pub2', role: 'OWNER' },
    { id: uid('m'), orgId: 'org_studio', userId: 'u_prov2', role: 'OWNER' },
  );

  db.providers.push(
    { id: uid('pp'), userId: 'u_prov1', displayName: '蒋吴琦', providerType: 'individual', region: '深圳',
      languages: ['中文', 'English'], skills: ['PCB设计', '嵌入式音频', 'I2S', 'KiCAD'], tools: ['KiCAD', 'Altium'],
      bio: '5 年硬件工程师，专注音频与传感器板卡（演示档案）。', canInvoice: false, supportsOnsite: true, supportsProduction: false,
      verifiedReal: false, verifiedCompany: false, completedProjects: 0, isDemo: true },
    { id: uid('pp'), userId: 'u_prov2', displayName: 'cly 设计工作室', providerType: 'studio', region: '上海',
      languages: ['中文'], skills: ['PCB Layout', '工业设计', '结构设计'], tools: ['Altium', 'SolidWorks'],
      bio: '小型硬件设计工作室（演示档案）。', canInvoice: true, supportsOnsite: false, supportsProduction: true,
      verifiedReal: false, verifiedCompany: false, completedProjects: 0, isDemo: true },
  );

  // 种子项目：已发布的 XIAO 音频播放器（来自 PRD 示例）
  const ai = getAiService();
  const audioPrd: Prd = {
    background: '面向创客、AIoT、教育、互动装置的开源音频播放器开发板，主控为 XIAO ESP32-S3 Plus。',
    goals: '提供本地音频播放、扬声器外放、3.5mm 耳机输出、电池供电、实体按键控制，并预留 B2B Mic/Cam 扩展。',
    scenarios: '口袋音频播放器；网络电台；可编程音效板；IoT 语音播报；后续 AI 多媒体扩展。',
    functional: 'MAX98357A I2S Class-D 功放 + JST-PH 2.0 接口；PCM5102A DAC + 3.5mm 耳机；microSD（FAT）；3 实体按键 USR1/2/3；2x3 跳线在按键/I2C 间切换。',
    performance: '电池供电推荐 8Ω/1W 扬声器；5V 供电可配更大功率扬声器；支持 WAV 稳定播放、评估 MP3。',
    io: 'D0 SD_CS；D1 I2S_BCLK；D2 USR1；D3 I2S_LRCK；D4 USR2/SDA；D5 USR3/SCL；D6 I2S_DOUT；D7 SPK_EN；D8-D10 SD SPI；D11-D19 预留 B2B。',
    interfaces: 'I2S、I2C（跳线）、microSD SPI、3.5mm、JST-PH 2.0、4Pin 通孔扩展。',
    dimensions: 'XIAO 1x3 板形（25*63mm）。',
    power: 'JST-PH 2.0 3.7V 锂电；2 档 SMD 电源开关。',
    costTarget: '8 RMB',
    budget: '1-5万',
    duration: '2个月',
    contractorWork: '原理图、PCB Layout、器件选型与 BOM、生产文件、基础驱动与出货测试固件。',
    outOfScope: 'B2B 小板本身的设计；量产。',
    deliverables: ['KiCAD 工程文件', '引脚定义表', '固件源码', '可烧录文件', '完整 BOM', '控制指令说明', '测试 Demo', '简单使用说明'],
    acceptance: 'Speaker / Headphone 正常出声；SD 卡读卡与 WAV 播放；三按键功能；出货测试固件通过。',
    ip: '交付源码与工程文件，授权方式随合同确认。',
    confidentiality: '随外包合同向已签署 NDA 的合作方发放受控副本。',
    skills: 'PCB 设计、嵌入式音频、I2S、KiCAD',
    risks: '目标 BOM 成本与指定器件匹配度需确认。',
  };
  const fee = computeFee('1-5万');
  const proj: T.OutsourcingProject = {
    id: 'proj_xiao_audio', orgId: 'org_seeed', creatorId: 'u_pub1',
    title: '基于 XIAO ESP32-S3 Plus 的开源音频播放器开发板', projectType: 'hardware', industry: '消费电子',
    budgetRange: '1-5万', durationText: '2个月', skills: ['PCB设计', '嵌入式音频', 'I2S', 'KiCAD'],
    tags: ['ESP32-S3', 'I2S', 'MAX98357A', 'PCM5102A'], location: '深圳',
    visibility: 'summary_apply', needNda: true, status: 'published', reviewNote: null,
    feeTotal: fee.total, paid: true, payOrderNo: 'PAYDEMO0001',
    isDemo: true, deletedAt: null, createdAt: now(), updatedAt: now(),
  };
  db.projects.push(proj);
  const comp = await ai.analyzeRequirementCompleteness(audioPrd);
  db.versions.push({ id: uid('v'), projectId: proj.id, versionNo: 1, requirement: audioPrd, completeness: comp.score, createdById: 'u_pub1', createdAt: now() });

  // 第二个演示项目：一条已转入 ezPLM 的完整链路
  const gwPrd: Prd = {
    background: '活鱼运输物联网网关，需采集水温/溶氧/pH 并 4G 上报。',
    goals: '完成 ESP32 网关固件，支持 MQTT 上报与 OTA。',
    functional: '传感器驱动、MQTT、OTA、低功耗。', performance: '4G 稳定上报；OTA 可靠。',
    interfaces: 'UART/I2C 传感器、4G 模组、MQTT。', budget: '1-5万', duration: '6周',
    contractorWork: '固件开发与现场联调。', deliverables: ['固件源码', '技术文档', '测试报告'],
    acceptance: '现场联调通过、OTA 成功。', skills: '嵌入式C、FreeRTOS、网络协议',
  };
  const gw: T.OutsourcingProject = {
    id: 'proj_gateway', orgId: 'org_seeed', creatorId: 'u_pub1',
    title: '活鱼运输物联网网关固件开发', projectType: 'firmware', industry: '农业物联网',
    budgetRange: '1-5万', durationText: '6周', skills: ['嵌入式C', 'FreeRTOS', 'MQTT'],
    tags: ['ESP32', 'MQTT', 'OTA'], location: '远程', visibility: 'summary_apply', needNda: false,
    status: 'transferred_to_ezplm', reviewNote: null, feeTotal: computeFee('1-5万').total, paid: true, payOrderNo: 'PAYDEMO0002',
    isDemo: true, deletedAt: null, createdAt: now(), updatedAt: now(),
  };
  db.projects.push(gw);
  const gwComp = await ai.analyzeRequirementCompleteness(gwPrd);
  const gwVer = { id: uid('v'), projectId: gw.id, versionNo: 1, requirement: gwPrd, completeness: gwComp.score, createdById: 'u_pub1', createdAt: now() };
  db.versions.push(gwVer);
  // 已接受的申请 + 合作 + ezPLM 链接
  const gwApp: T.ProjectApplication = {
    id: 'app_gateway', projectId: gw.id, versionId: gwVer.id, applicantId: 'u_prov1',
    proposal: { relevantExperience: '做过多款 ESP32 网关', approach: '分三里程碑交付', milestones: '驱动→上报→OTA' },
    quote: '3.5万', durationText: '6周', validUntil: null, status: 'accepted', selected: true, isDemo: true, deletedAt: null,
    createdAt: now(), updatedAt: now(),
  };
  db.applications.push(gwApp);
  const coop: T.CooperationConfirmation = {
    id: 'coop_gateway', projectId: gw.id, applicationId: gwApp.id, status: 'transferred',
    summary: { scope: gwPrd.contractorWork, budget: '3.5万', duration: '6周' },
    publisherConfirmedAt: now(), providerConfirmedAt: now(), ndaRequired: false, ndaPublisherSignedAt: null, ndaProviderSignedAt: null, ndaSignedAt: null, ndaVersion: null,
    createdAt: now(), updatedAt: now(),
  };
  db.cooperations.push(coop);
  db.ezLinks.push({
    id: uid('ez'), projectId: gw.id, ezplmOrgId: 'ORGSEEED', ezplmProjectId: 'EZGATEWAY',
    link: 'https://ezplm.cn/project/EZGATEWAY', syncStatus: 'success', syncError: null,
    idempotencyKey: 'seed-gateway', createdById: 'u_pub1', createdAt: now(), updatedAt: now(),
  });
}

function decorate(p: T.OutsourcingProject): T.OutsourcingProject {
  const versions = db.versions.filter((v) => v.projectId === p.id).sort((a, b) => b.versionNo - a.versionNo);
  const apps = db.applications.filter((a) => a.projectId === p.id && !a.deletedAt);
  return {
    ...p,
    currentVersion: versions[0] ?? null,
    applicationCount: apps.length,
    acceptedCount: apps.filter((a) => a.status === 'accepted').length,
  };
}

export const memoryRepo: Repo = {
  async getUser(id) { await seed(); return db.users.find((u) => u.id === id) ?? null; },
  async getUserByEmail(email) { await seed(); return db.users.find((u) => u.email === email.toLowerCase()) ?? null; },
  async createUser(input) {
    await seed();
    const u: T.User = {
      id: uid('u'), email: input.email.toLowerCase(), name: input.name,
      passwordHash: input.passwordHash, platformRole: input.platformRole || 'USER',
      accountType: input.accountType, isDemo: false,
    };
    db.users.push(u);
    return u;
  },
  async listDemoUsers() { await seed(); return db.users.filter((u) => u.isDemo); },
  async getOrgMember(orgId, userId) { await seed(); return db.members.find((m) => m.orgId === orgId && m.userId === userId) ?? null; },
  async getUserPrimaryOrg(userId) {
    await seed();
    const m = db.members.find((x) => x.userId === userId);
    return m ? db.orgs.find((o) => o.id === m.orgId) ?? null : null;
  },
  async getProviderProfile(userId) { await seed(); return db.providers.find((p) => p.userId === userId) ?? null; },
  async getOrganization(id) { await seed(); return db.orgs.find((o) => o.id === id) ?? null; },

  async createProject(input) {
    await seed();
    const id = uid('proj');
    const p: T.OutsourcingProject = {
      id, orgId: input.orgId, creatorId: input.creatorId, title: input.title, projectType: input.projectType,
      industry: input.industry ?? null, budgetRange: input.budgetRange, durationText: input.durationText,
      skills: input.skills, tags: input.tags, location: input.location, visibility: input.visibility,
      needNda: input.needNda, status: 'draft', reviewNote: null, feeTotal: input.feeTotal, paid: false,
      payOrderNo: null, isDemo: false, deletedAt: null, createdAt: now(), updatedAt: now(),
    };
    db.projects.push(p);
    db.versions.push({ id: uid('v'), projectId: id, versionNo: 1, requirement: input.prd, completeness: input.completeness, createdById: input.creatorId, createdAt: now() });
    return decorate(p);
  },
  async getProject(id) { await seed(); const p = db.projects.find((x) => x.id === id && !x.deletedAt); return p ? decorate(p) : null; },
  async listProjects(q: ProjectQuery) {
    await seed();
    let list = db.projects.filter((p) => !p.deletedAt);
    if (q.publicOnly) list = list.filter((p) => p.status === 'published');
    if (q.status) list = list.filter((p) => p.status === q.status);
    if (q.statuses) list = list.filter((p) => q.statuses!.includes(p.status));
    if (q.orgId) list = list.filter((p) => p.orgId === q.orgId);
    if (q.creatorId) list = list.filter((p) => p.creatorId === q.creatorId);
    return list.map(decorate).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async updateProjectFields(id, patch) {
    await seed();
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new Error('项目不存在');
    Object.assign(p, patch, { updatedAt: now() });
    return decorate(p);
  },
  async setProjectStatus(id, status) {
    await seed();
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new Error('项目不存在');
    p.status = status; p.updatedAt = now();
    return decorate(p);
  },
  async addProjectVersion(projectId, prd, completeness, createdById) {
    await seed();
    const versions = db.versions.filter((v) => v.projectId === projectId);
    const versionNo = versions.length + 1;
    const v: T.ProjectVersion = { id: uid('v'), projectId, versionNo, requirement: prd, completeness, createdById, createdAt: now() };
    db.versions.push(v);
    return v;
  },
  async getCurrentVersion(projectId) {
    await seed();
    return db.versions.filter((v) => v.projectId === projectId).sort((a, b) => b.versionNo - a.versionNo)[0] ?? null;
  },

  async createApplication(input) {
    await seed();
    const id = uid('app');
    const a: T.ProjectApplication = {
      id, projectId: input.projectId, versionId: input.versionId ?? null, applicantId: input.applicantId,
      proposal: input.proposal, quote: input.quote, durationText: input.durationText, validUntil: input.validUntil ?? null,
      status: input.status, selected: false, isDemo: false, deletedAt: null, createdAt: now(), updatedAt: now(),
    };
    db.applications.push(a);
    return { ...a, applicantName: userName(a.applicantId) };
  },
  async getApplication(id) {
    await seed();
    const a = db.applications.find((x) => x.id === id && !x.deletedAt);
    if (!a) return null;
    const proj = db.projects.find((p) => p.id === a.projectId);
    return { ...a, applicantName: userName(a.applicantId), projectTitle: proj?.title };
  },
  async getApplicationByProjectUser(projectId, userId) {
    await seed();
    const a = db.applications.find((x) => x.projectId === projectId && x.applicantId === userId && !x.deletedAt);
    return a ? { ...a, applicantName: userName(a.applicantId) } : null;
  },
  async listApplicationsForProject(projectId) {
    await seed();
    return db.applications.filter((a) => a.projectId === projectId && !a.deletedAt)
      .map((a) => ({ ...a, applicantName: userName(a.applicantId), applicantEmail: userEmail(a.applicantId) }))
      .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
  },
  async listApplicationsByUser(userId) {
    await seed();
    return db.applications.filter((a) => a.applicantId === userId && !a.deletedAt)
      .map((a) => ({ ...a, applicantName: userName(a.applicantId), projectTitle: db.projects.find((p) => p.id === a.projectId)?.title }))
      .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
  },
  async updateApplicationFields(id, patch) {
    await seed();
    const a = db.applications.find((x) => x.id === id);
    if (!a) throw new Error('申请不存在');
    Object.assign(a, patch, { updatedAt: now() });
    return { ...a, applicantName: userName(a.applicantId) };
  },
  async setApplicationStatus(id, status, _actorId, _note) {
    await seed();
    const a = db.applications.find((x) => x.id === id);
    if (!a) throw new Error('申请不存在');
    a.status = status; a.updatedAt = now();
    return { ...a, applicantName: userName(a.applicantId) };
  },
  async setApplicationSelected(id, selected) {
    await seed();
    const a = db.applications.find((x) => x.id === id);
    if (!a) throw new Error('申请不存在');
    a.selected = selected; a.updatedAt = now();
    return { ...a, applicantName: userName(a.applicantId), applicantEmail: userEmail(a.applicantId) };
  },

  async ensureConversation(applicationId) {
    await seed();
    let c = db.conversations.find((x) => x.applicationId === applicationId);
    if (c) return c;
    const a = db.applications.find((x) => x.id === applicationId)!;
    const proj = db.projects.find((p) => p.id === a.projectId)!;
    c = { id: uid('conv'), applicationId, createdAt: now(), participants: [
      { userId: proj.creatorId, role: 'publisher' },
      { userId: a.applicantId, role: 'provider' },
    ] };
    db.conversations.push(c);
    return c;
  },
  async getConversation(id) { await seed(); return db.conversations.find((c) => c.id === id) ?? null; },
  async getConversationByApplication(applicationId) { await seed(); return db.conversations.find((c) => c.applicationId === applicationId) ?? null; },
  async listMessages(conversationId) {
    await seed();
    return db.messages.filter((m) => m.conversationId === conversationId)
      .map((m) => ({ ...m, senderName: userName(m.senderId) }))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  },
  async addMessage(conversationId, senderId, body, kind) {
    await seed();
    const m: T.Message = { id: uid('msg'), conversationId, senderId, kind, body, createdAt: now() };
    db.messages.push(m);
    return { ...m, senderName: userName(senderId) };
  },
  async listClarifications(conversationId) {
    await seed();
    return db.clarifications.filter((q) => q.conversationId === conversationId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  },
  async getClarification(id) {
    await seed();
    return db.clarifications.find((q) => q.id === id) ?? null;
  },
  async addClarification(conversationId, askedById, question, affectsScope) {
    await seed();
    const q: T.ClarificationQuestion = { id: uid('clr'), conversationId, question, answer: null, askedById, answeredById: null, affectsScope, status: 'open', createdAt: now(), updatedAt: now() };
    db.clarifications.push(q);
    return q;
  },
  async answerClarification(id, answeredById, answer, status) {
    await seed();
    const q = db.clarifications.find((x) => x.id === id);
    if (!q) throw new Error('问题不存在');
    q.answer = answer; q.answeredById = answeredById; q.status = status; q.updatedAt = now();
    return q;
  },

  async ensureCooperation(projectId, applicationId, ndaRequired, summary) {
    await seed();
    let c = db.cooperations.find((x) => x.projectId === projectId);
    if (c) return c;
    c = { id: uid('coop'), projectId, applicationId, status: 'not_started', summary, publisherConfirmedAt: null, providerConfirmedAt: null, ndaRequired, ndaPublisherSignedAt: null, ndaProviderSignedAt: null, ndaSignedAt: null, ndaVersion: null, createdAt: now(), updatedAt: now() };
    db.cooperations.push(c);
    return c;
  },
  async resetCooperation(id, applicationId, ndaRequired, summary) {
    await seed();
    const c = db.cooperations.find((x) => x.id === id);
    if (!c) throw new Error('合作记录不存在');
    Object.assign(c, {
      applicationId, status: 'not_started', summary, ndaRequired,
      publisherConfirmedAt: null, providerConfirmedAt: null,
      ndaPublisherSignedAt: null, ndaProviderSignedAt: null, ndaSignedAt: null, ndaVersion: null, updatedAt: now(),
    });
    // 清空旧的待确认事项
    db.confItems = db.confItems.filter((i) => i.cooperationId !== id);
    return c;
  },
  async getCooperation(projectId) { await seed(); return db.cooperations.find((c) => c.projectId === projectId) ?? null; },
  async getCooperationById(id) { await seed(); return db.cooperations.find((c) => c.id === id) ?? null; },
  async setCooperationStatus(id, status, side) {
    await seed();
    const c = db.cooperations.find((x) => x.id === id);
    if (!c) throw new Error('合作记录不存在');
    c.status = status; c.updatedAt = now();
    if (side === 'publisher') c.publisherConfirmedAt = now();
    if (side === 'provider') c.providerConfirmedAt = now();
    return c;
  },
  async setNdaSigned(id, side, version) {
    await seed();
    const c = db.cooperations.find((x) => x.id === id);
    if (!c) throw new Error('合作记录不存在');
    if (side === 'publisher') c.ndaPublisherSignedAt = now();
    if (side === 'provider') c.ndaProviderSignedAt = now();
    // 双方都已签署才视为 NDA 生效
    if (c.ndaPublisherSignedAt && c.ndaProviderSignedAt) { c.ndaSignedAt = now(); c.ndaVersion = version; }
    c.updatedAt = now();
    return c;
  },
  async listConfirmationItems(cooperationId) { await seed(); return db.confItems.filter((i) => i.cooperationId === cooperationId); },
  async addConfirmationItem(cooperationId, label, value) {
    await seed();
    const i: T.ConfirmationItem = { id: uid('ci'), cooperationId, label, value: value ?? null, status: 'pending' };
    db.confItems.push(i);
    return i;
  },
  async setConfirmationItemStatus(id, status) {
    await seed();
    const i = db.confItems.find((x) => x.id === id);
    if (!i) throw new Error('确认项不存在');
    i.status = status;
    return i;
  },

  async getEzplmLink(projectId) { await seed(); return db.ezLinks.find((l) => l.projectId === projectId) ?? null; },
  async upsertEzplmLink(projectId, data) {
    await seed();
    let l = db.ezLinks.find((x) => x.projectId === projectId);
    if (!l) {
      l = { id: uid('ez'), projectId, ezplmOrgId: null, ezplmProjectId: null, link: null, syncStatus: 'not_started', syncError: null, idempotencyKey: null, createdById: null, createdAt: now(), updatedAt: now() };
      db.ezLinks.push(l);
    }
    Object.assign(l, data, { updatedAt: now() });
    return l;
  },

  async audit(actorId, action, entity, entityId, detail) {
    await seed();
    db.audits.push({ id: uid('aud'), actorId, action, entity, entityId, detail: detail ? JSON.stringify(detail) : undefined, createdAt: now() });
  },
};
