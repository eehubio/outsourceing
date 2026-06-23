// SQLite 无原生数组/JSON 列，统一以字符串存储，这里封装安全读写。

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

// 结构化需求书（PRD）。第一轮沿用并扩展 v1 的章节。
export interface Prd {
  background?: string;
  goals?: string;
  scenarios?: string;
  scope?: string;
  functional?: string;
  performance?: string;
  io?: string;
  interfaces?: string;
  environment?: string;
  dimensions?: string;
  power?: string;
  costTarget?: string;
  budget?: string;
  duration?: string;
  existingBase?: string;
  contractorWork?: string;
  outOfScope?: string;
  deliverables?: string[];
  acceptance?: string;
  ip?: string;
  confidentiality?: string;
  skills?: string;
  risks?: string;
}

export function emptyPrd(): Prd {
  return { deliverables: [] };
}
