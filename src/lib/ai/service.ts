// AI 服务抽象。第一轮提供规则版 Mock（完整度分析），
// 接口预留 OpenAI/Claude/Gemini 接入；AI 输出不直接改业务状态，由用户确认。

import type { Prd } from '../json';

export interface CompletenessReport {
  score: number; // 0-100
  missing: string[];
  warnings: string[];
}

export interface OutsourcingAiService {
  analyzeRequirementCompleteness(prd: Prd): Promise<CompletenessReport>;
}

const REQUIRED_FIELDS: { key: keyof Prd; label: string }[] = [
  { key: 'background', label: '项目背景' },
  { key: 'goals', label: '项目目标' },
  { key: 'functional', label: '功能需求' },
  { key: 'performance', label: '性能指标' },
  { key: 'interfaces', label: '接口要求' },
  { key: 'budget', label: '项目预算' },
  { key: 'duration', label: '期望周期' },
  { key: 'contractorWork', label: '承接方需完成的工作' },
  { key: 'acceptance', label: '验收建议' },
];

class RuleBasedAiService implements OutsourcingAiService {
  async analyzeRequirementCompleteness(prd: Prd): Promise<CompletenessReport> {
    const missing: string[] = [];
    let filled = 0;
    for (const f of REQUIRED_FIELDS) {
      const v = prd[f.key];
      if (typeof v === 'string' && v.trim().length >= 4) filled += 1;
      else missing.push(f.label);
    }
    if (!prd.deliverables || prd.deliverables.length === 0) missing.push('交付物清单');

    const warnings: string[] = [];
    if (prd.budget && prd.costTarget && /面议/.test(prd.budget)) {
      warnings.push('预算为「面议」但已设定目标成本，建议给出预算区间以便承接方报价');
    }
    if (prd.functional && prd.functional.length < 30) {
      warnings.push('功能需求描述偏简略，可能导致报价偏差');
    }

    const denom = REQUIRED_FIELDS.length + 1; // +1 交付物
    const score = Math.round(((denom - missing.length) / denom) * 100);
    return { score: Math.max(0, Math.min(100, score)), missing, warnings };
  }
}

export function getAiService(): OutsourcingAiService {
  return new RuleBasedAiService();
}
