import type { Repo } from './types-repo';
import { memoryRepo } from './memory';
import { prismaRepo } from './prisma-repo';

// DATA_BACKEND=memory（默认，零依赖即跑）| prisma（生产，需可用数据库 + 已生成的 Prisma 引擎）
let cached: Repo | null = null;

export function getRepo(): Repo {
  if (cached) return cached;
  const backend = process.env.DATA_BACKEND || 'memory';
  cached = backend === 'prisma' ? prismaRepo : memoryRepo;
  return cached;
}
