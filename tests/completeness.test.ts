import { describe, it, expect } from 'vitest';
import { getAiService } from '@/lib/ai/service';

describe('需求完整度分析', () => {
  it('空需求评分低且列出缺失', async () => {
    const r = await getAiService().analyzeRequirementCompleteness({});
    expect(r.score).toBeLessThan(30);
    expect(r.missing.length).toBeGreaterThan(0);
  });
  it('完整需求评分高', async () => {
    const r = await getAiService().analyzeRequirementCompleteness({
      background: '背景信息充分', goals: '目标明确具体', functional: '功能需求详细列出多条内容说明',
      performance: '性能指标量化', interfaces: '接口要求清晰', budget: '1-5万', duration: '6周',
      contractorWork: '承接方完成项', acceptance: '验收标准', deliverables: ['源码', 'PCB'],
    });
    expect(r.score).toBeGreaterThanOrEqual(90);
  });
});
