import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaClientOptions = process.env.NODE_ENV === 'production' 
  ? { log: ['error'] as Prisma.LogLevel[] }
  : { log: ['query', 'info', 'warn', 'error'] as Prisma.LogLevel[] }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  ...prismaClientOptions,
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 