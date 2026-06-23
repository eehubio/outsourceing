// ezPLM 集成服务：抽象接口 + Mock 实现 + 正式 Adapter 占位。
// 跳转链接不硬编码在页面，统一经 getProjectLink 生成。

export interface CreateProjectInput {
  outsourcingProjectId: string;
  title: string;
  summary: string;
  requirement: unknown;
  publisherOrgId: string;
  providerUserId: string;
  projectType: string;
  budget: string;
  duration: string;
  deliverables: string[];
  skills: string[];
  confirmedItems: { label: string; value?: string | null }[];
  applicationId: string;
  idempotencyKey: string;
}

export interface CreateProjectResult {
  ezplmOrgId: string;
  ezplmProjectId: string;
  link: string;
  status: 'success' | 'partial_success' | 'failed';
  error?: string;
}

export interface EzplmIntegrationService {
  createProjectFromOutsourcing(input: CreateProjectInput): Promise<CreateProjectResult>;
  getProjectLink(ezplmProjectId: string): string;
}

const BASE = process.env.EZPLM_BASE_URL || 'https://ezplm.cn';

// Mock：本地确定性模拟，不调外部。幂等键相同则返回同一结果（演示稳定）。
class MockEzplmService implements EzplmIntegrationService {
  private store = new Map<string, CreateProjectResult>();

  async createProjectFromOutsourcing(input: CreateProjectInput): Promise<CreateProjectResult> {
    if (this.store.has(input.idempotencyKey)) {
      return this.store.get(input.idempotencyKey)!;
    }
    const ezplmProjectId = 'EZ' + input.outsourcingProjectId.slice(-8).toUpperCase();
    const ezplmOrgId = 'ORG' + input.publisherOrgId.slice(-6).toUpperCase();
    const result: CreateProjectResult = {
      ezplmOrgId,
      ezplmProjectId,
      link: this.getProjectLink(ezplmProjectId),
      status: 'success',
    };
    this.store.set(input.idempotencyKey, result);
    return result;
  }

  getProjectLink(ezplmProjectId: string): string {
    return `${BASE}/project/${ezplmProjectId}`;
  }
}

// 正式 Adapter 占位：内植时实现真实 HTTP 调用（见 README 的 API 契约）。
class HttpEzplmService implements EzplmIntegrationService {
  async createProjectFromOutsourcing(): Promise<CreateProjectResult> {
    throw new Error('HttpEzplmService 尚未实现，请对接 ezPLM 后端 API');
  }
  getProjectLink(ezplmProjectId: string): string {
    return `${BASE}/project/${ezplmProjectId}`;
  }
}

export function getEzplmService(): EzplmIntegrationService {
  return process.env.EZPLM_API_MODE === 'http' ? new HttpEzplmService() : new MockEzplmService();
}
