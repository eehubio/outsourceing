// 业务常量与枚举（单一事实来源）

export const PROJECT_TYPES = [
  { id: 'hardware', label: '硬件电路设计' },
  { id: 'pcb', label: 'PCB Layout' },
  { id: 'firmware', label: '嵌入式固件' },
  { id: 'fpga', label: 'FPGA 开发' },
  { id: 'software', label: 'Web / APP 软件' },
  { id: 'ai', label: '算法与 AI' },
  { id: 'industrial', label: '工业设计' },
  { id: 'mechanical', label: '结构设计' },
  { id: 'test', label: '测试与认证' },
  { id: 'pilot', label: '小批量试产' },
  { id: 'bom', label: 'BOM 优化与器件替代' },
  { id: 'diagnosis', label: '故障诊断' },
  { id: 'consulting', label: '技术咨询' },
  { id: 'system', label: '综合软硬件项目' },
  { id: 'other', label: '其他' },
] as const;

export type ProjectTypeId = (typeof PROJECT_TYPES)[number]['id'];
export const projectTypeLabel = (id: string) =>
  PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;

export const BUDGET_RANGES = ['< 1万', '1-5万', '5-10万', '10万+', '面议'] as const;

export const VISIBILITY = {
  public: '完全公开',
  summary_login: '摘要公开，登录看详情',
  summary_apply: '摘要公开，申请后看详情',
  nda: '签署 NDA 后看完整需求',
  invite_only: '仅受邀可见',
  org_only: '仅指定组织可见',
} as const;
export type Visibility = keyof typeof VISIBILITY;

// 费用规则：预算区间中值 × 1% + ¥10。集中此处，便于内植时改为按实报金额。
const BUDGET_MIDPOINTS: Record<string, number> = {
  '< 1万': 5000, '1-5万': 30000, '5-10万': 75000, '10万+': 150000, '面议': 30000,
};
export function computeFee(budget: string) {
  const base = BUDGET_MIDPOINTS[budget] ?? 30000;
  const pct = Math.round(base * 0.01);
  const flat = 10;
  return { budgetBase: base, pct, flat, total: pct + flat };
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  revision_required: '需修改',
  published: '已发布',
  paused: '已暂停',
  matched: '已匹配',
  cooperation_confirming: '合作确认中',
  transferred_to_ezplm: '已转入 ezPLM',
  closed: '已关闭',
  rejected: '已驳回',
  cancelled: '已取消',
};

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  under_discussion: '沟通中',
  shortlisted: '候选名单',
  invited: '已邀请',
  accepted: '已接受',
  rejected: '已拒绝',
  withdrawn: '已撤回',
  expired: '已过期',
};

export const COOPERATION_STATUS_LABEL: Record<string, string> = {
  not_started: '未开始',
  publisher_confirmed: '发布方已确认',
  provider_confirmed: '服务方已确认',
  both_confirmed: '双方已确认',
  cancelled: '已取消',
  transferred: '已移交',
};
