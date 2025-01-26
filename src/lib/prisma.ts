import { PrismaClient } from '@prisma/client'
import { withRetry } from './retryUtils'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

interface PrismaError extends Error {
  code?: string;
}

// Wrapper function to add retry functionality to Prisma operations
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  options = {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 2000,
    shouldRetry: (error: PrismaError) => {
      // Retry on connection errors or deadlocks
      return (
        error.code === 'P1001' || // Authentication failed
        error.code === 'P1002' || // Connection timed out
        error.code === 'P1008' || // Operations timed out
        error.code === 'P1017' || // Server closed the connection
        error.code === 'P2034'    // Transaction deadlock
      )
    }
  }
): Promise<T> {
  return withRetry<T, PrismaError>(operation, options)
}

export default prisma 