import type { PrismaClient } from '@prisma/client';

// 惰性单例：仅在首次真正使用（DATA_BACKEND=prisma）时才构造 PrismaClient，
// 避免 memory 模式或无生成客户端的环境（如未跑 prisma generate）在导入期就报错。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      // 运行时再加载，确保此时已执行过 prisma generate
      const { PrismaClient } = require('@prisma/client');
      globalForPrisma.prisma = new PrismaClient({ log: ['error', 'warn'] });
    }
    // 动态转发到真实客户端
    return (globalForPrisma.prisma as Record<string | symbol, unknown>)[prop];
  },
});
