import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let dbInstance: PrismaClient
try {
  dbInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ['query'],
    })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = dbInstance
} catch {
  console.warn('[AI Studio] Database not connected — using mock')
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
    update: async (d: { data?: Record<string, unknown> }) => d?.data ?? {},
    delete: async () => ({}),
  }
  dbInstance = new Proxy({} as PrismaClient, { get: () => noOp })
}

export const db = dbInstance