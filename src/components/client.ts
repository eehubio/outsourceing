'use client';

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as any).error || `请求失败 (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', pending_review: '待审核', revision_required: '需修改', published: '已发布',
  paused: '已暂停', matched: '已匹配', cooperation_confirming: '合作确认中',
  transferred_to_ezplm: '已转入 ezPLM', closed: '已关闭', rejected: '已驳回', cancelled: '已取消',
};
export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', submitted: '已提交', under_discussion: '沟通中', shortlisted: '候选名单',
  invited: '已邀请', accepted: '已接受', rejected: '已拒绝', withdrawn: '已撤回', expired: '已过期',
};
export const COOP_STATUS_LABEL: Record<string, string> = {
  not_started: '未开始', publisher_confirmed: '发布方已确认', provider_confirmed: '服务方已确认',
  both_confirmed: '双方已确认', cancelled: '已取消', transferred: '已移交',
};
