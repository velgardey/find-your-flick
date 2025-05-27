import { prisma, withPrismaRetry } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/authMiddleware'
import { successResponse, handleApiError } from '@/lib/apiResponse'
import { withCache, generateCacheKey, CACHE_TTL } from '@/lib/redis'

// GET /api/history - Get user's watch history
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      // Return empty history for unauthenticated users
      return successResponse({ data: [] })
    }

    // Generate cache key based on user ID
    const cacheKey = generateCacheKey('history', { userId: auth.user.uid })
    
    // Use the withCache helper to handle caching logic
    const history = await withCache(
      cacheKey,
      CACHE_TTL.WATCHLIST, // Reuse the same TTL as watchlist
      async () => {
        // First, ensure the user exists in the database
        await withPrismaRetry(() => 
          prisma.user.upsert({
            where: { id: auth.user.uid },
            update: {},
            create: {
              id: auth.user.uid,
              email: auth.user.email,
              displayName: auth.user.name,
              photoURL: auth.user.picture,
            },
          })
        )
    
        // Get all entries that have been watched (have lastWatched date)
        const historyItems = await withPrismaRetry(() => 
          prisma.watchlistEntry.findMany({
            where: { 
              userId: auth.user.uid,
              lastWatched: { not: null }
            },
            orderBy: { lastWatched: 'desc' },
          })
        );
        
        // Return an array even if no items found
        return historyItems || []
      }
    )

    // Return the history items directly without wrapping in a data property
    return new Response(JSON.stringify(history), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in history GET:', error)
    return handleApiError(error)
  }
}
