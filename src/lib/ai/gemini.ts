// 用 Gemini 解析 PDF 规范文档为结构化 PRD 字段。
// API key 仅在服务端使用（GEMINI_API_KEY 环境变量），绝不暴露给前端。
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Prd } from '../json';

const PRD_FIELDS = `
{
  "title": "项目标题（简短）",
  "background": "项目背景",
  "goals": "项目目标",
  "scenarios": "应用场景",
  "functional": "功能需求（逐条）",
  "performance": "性能指标（量化）",
  "io": "输入输出",
  "interfaces": "接口要求",
  "environment": "环境条件",
  "dimensions": "尺寸限制",
  "power": "功耗要求",
  "costTarget": "目标成本",
  "budget": "项目预算（如有）",
  "duration": "期望周期（如有）",
  "contractorWork": "承接方需完成的工作",
  "outOfScope": "不在项目范围内的工作",
  "acceptance": "验收建议",
  "ip": "知识产权要求",
  "confidentiality": "保密要求",
  "skills": "所需技能（逗号分隔）",
  "risks": "风险与不确定项",
  "deliverables": ["交付物1", "交付物2"]
}`;

export interface PdfParseResult {
  title?: string;
  prd: Prd;
  raw?: string;
}

export function geminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function parsePdfToPrd(pdfBase64: string): Promise<PdfParseResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('未配置 GEMINI_API_KEY，无法使用 AI 解析');

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `你是硬件研发外包平台的需求分析助手。请阅读这份硬件/嵌入式项目的 PRD 或规范文档，抽取信息并填充下面的 JSON 结构。
要求：
- 只输出 JSON，不要任何解释、不要 markdown 代码块包裹。
- 字段在文档中找不到就留空字符串 ""（deliverables 留空数组）。
- functional/contractorWork 等长字段用简洁中文分条概括，不要照抄整段。
- skills 用逗号分隔的技能关键词。

JSON 结构：
${PRD_FIELDS}`;

  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    { text: prompt },
  ]);

  let text = result.response.text().trim();
  // 去掉可能的 ```json 包裹
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('AI 返回内容无法解析为结构化字段，请重试或手动填写');
  }

  const title = typeof parsed.title === 'string' ? parsed.title : undefined;
  const prd: Prd = {};
  const strKeys: (keyof Prd)[] = ['background', 'goals', 'scenarios', 'functional', 'performance', 'io', 'interfaces', 'environment', 'dimensions', 'power', 'costTarget', 'budget', 'duration', 'contractorWork', 'outOfScope', 'acceptance', 'ip', 'confidentiality', 'skills', 'risks'];
  for (const k of strKeys) {
    const v = parsed[k];
    if (typeof v === 'string' && v.trim()) (prd as Record<string, unknown>)[k] = v.trim();
  }
  if (Array.isArray(parsed.deliverables)) {
    prd.deliverables = (parsed.deliverables as unknown[]).filter((d): d is string => typeof d === 'string' && !!d.trim());
  }
  return { title, prd };
}
