import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import { withRetry } from './retryUtils'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Create a base Prisma client
const createPrismaClient = () => {
  // Initialize the base Prisma client
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? [] : ['error']
  })

  // Try to use Accelerate if available, fall back to direct connection if it fails
  try {
    // When using Prisma Accelerate, we don't need to specify datasources
    // as it's handled by the DATABASE_URL which should start with prisma://
    return client.$extends(withAccelerate())
  } catch (error) {
    console.warn('Failed to initialize Prisma Accelerate, using direct connection:', error)
    // If Accelerate fails, fall back to direct connection
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? [] : ['error'],
      datasources: {
        db: {
          url: process.env.DIRECT_URL || ''
        }
      }
    })
  }
}

// Use existing client from global object or create a new one
export const prisma = globalForPrisma.prisma || createPrismaClient()

// Save client reference in development to avoid multiple instances
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