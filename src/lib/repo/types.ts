// 领域类型：在 Prisma 模型基础上，JSON 字段已解析为对象/数组。
// 两个仓储适配器（memory / prisma）都返回这些形状。

import type { Prd } from '../json';

export interface User {
  id: string; email: string; name: string; avatar?: string | null;
  platformRole: string; accountType: string; passwordHash?: string | null; isDemo: boolean;
}
export interface Organization { id: string; name: string; type: string; isDemo: boolean; }
export interface OrganizationMember { id: string; orgId: string; userId: string; role: string; }

export interface ProviderProfile {
  id: string; userId: string; displayName: string; providerType: string;
  region?: string | null; languages: string[]; skills: string[]; tools: string[];
  bio?: string | null; canInvoice: boolean; supportsOnsite: boolean; supportsProduction: boolean;
  verifiedReal: boolean; verifiedCompany: boolean; completedProjects: number; isDemo: boolean;
}

export interface ProjectVersion {
  id: string; projectId: string; versionNo: number; requirement: Prd;
  completeness: number; createdById: string; createdAt: string;
}

export interface OutsourcingProject {
  id: string; orgId: string; creatorId: string;
  title: string; projectType: string; industry?: string | null;
  budgetRange: string; durationText: string; skills: string[]; tags: string[]; location: string;
  visibility: string; needNda: boolean; status: string; reviewNote?: string | null;
  feeTotal: number; paid: boolean; payOrderNo?: string | null;
  isDemo: boolean; deletedAt?: string | null; createdAt: string; updatedAt: string;
  // 派生
  currentVersion?: ProjectVersion | null;
  applicationCount?: number;
  acceptedCount?: number;
}

export interface ApplicationProposal {
  // 基本与经验
  realName?: string;            // 真实姓名/团队名
  contact?: string;             // 联系方式（手机/微信/邮箱）
  identityType?: string;        // 个人工程师 | 设计工作室 | 研发公司 | 高校团队
  region?: string;              // 所在地
  yearsExperience?: string;     // 从业年限
  // 能力匹配
  relevantExperience?: string;  // 相关项目经验
  matchedSkills?: string;       // 匹配技能
  familiarMcuEda?: string;      // 熟悉的 MCU/FPGA/EDA 工具
  toolchain?: string;           // 工具链（KiCAD/Altium/SolidWorks…）
  understanding?: string;       // 对需求的理解
  approach?: string;            // 初步技术方案
  milestones?: string;          // 建议里程碑
  risks?: string;               // 主要风险
  questions?: string;           // 需甲方确认的问题
  cases?: string;               // 相关案例/作品链接
  excludes?: string;            // 报价不包含项
  availableFrom?: string;       // 可开始时间
  canInvoice?: boolean;         // 是否可开票
  supportsProduction?: boolean; // 是否支持小批量生产
  supportsOnsite?: boolean;     // 是否支持现场
}

export interface ProjectApplication {
  id: string; projectId: string; versionId?: string | null; applicantId: string;
  proposal: ApplicationProposal; quote: string; durationText: string; validUntil?: string | null;
  status: string; selected: boolean; isDemo: boolean; deletedAt?: string | null; createdAt: string; updatedAt: string;
  // 派生
  applicantName?: string;
  applicantEmail?: string;
  projectTitle?: string;
}

export interface Message {
  id: string; conversationId: string; senderId: string; senderName?: string;
  kind: string; body: string; createdAt: string;
}
export interface Conversation {
  id: string; applicationId: string; createdAt: string;
  participants: { userId: string; role: string }[];
}
export interface ClarificationQuestion {
  id: string; conversationId: string; question: string; answer?: string | null;
  askedById: string; answeredById?: string | null; affectsScope: boolean; status: string;
  createdAt: string; updatedAt: string;
}

export interface CooperationConfirmation {
  id: string; projectId: string; applicationId: string; status: string;
  summary: Record<string, unknown>; publisherConfirmedAt?: string | null; providerConfirmedAt?: string | null;
  ndaRequired: boolean; ndaPublisherSignedAt?: string | null; ndaProviderSignedAt?: string | null; ndaSignedAt?: string | null; ndaVersion?: string | null;
  createdAt: string; updatedAt: string;
}
export interface ConfirmationItem {
  id: string; cooperationId: string; label: string; value?: string | null; status: string;
}

export interface EzplmProjectLink {
  id: string; projectId: string; ezplmOrgId?: string | null; ezplmProjectId?: string | null;
  link?: string | null; syncStatus: string; syncError?: string | null;
  idempotencyKey?: string | null; createdById?: string | null; createdAt: string; updatedAt: string;
}
