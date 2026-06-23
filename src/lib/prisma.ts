import type { PrismaClient } from '@prisma/client';

// 惰性单例：仅在首次真正使用（DATA_BACKEND=prisma）时才构造 PrismaClient，
// 避免 memory 模式或无生成客户端的环境（如未跑 prisma generate）在导入期就报错。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // 运行时再加载，确保此时已执行过 prisma generate
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');
    globalForPrisma.prisma = new PrismaClient({ log: ['error', 'warn'] });
  }
  return globalForPrisma.prisma as PrismaClient;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    // 绑定方法的 this，避免脱离客户端实例调用
    return typeof value === 'function' ? value.bind(client) : value;
  },
});