import { prisma, withPrismaRetry } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/authMiddleware'
import { 
  successResponse, 
  handleApiError
} from '@/lib/apiResponse'
import { watchlistCreateSchema } from '@/lib/validationSchemas'
import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'
import { withCache, generateCacheKey, CACHE_TTL, invalidateCache } from '@/lib/redis'

// GET /api/watchlist - Get user's watchlist
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      // Return empty watchlist for unauthenticated users
      return successResponse({ data: [] })
    }

    // Get search query from URL params
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')?.toLowerCase()
    
    // Generate cache key based on user ID and search query
    const cacheKey = generateCacheKey('watchlist', { 
      userId: auth.user.uid, 
      search: searchQuery || '' 
    })
    
    // Use the withCache helper to handle caching logic
    const watchlist = await withCache(
      cacheKey,
      CACHE_TTL.WATCHLIST,
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
    
        return withPrismaRetry(() => 
          prisma.watchlistEntry.findMany({
            where: { 
              userId: auth.user.uid,
              ...(searchQuery && {
                title: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              })
            },
            orderBy: { updatedAt: 'desc' },
          })
        )
      }
    )

    return successResponse({ data: watchlist })
  } catch (error) {
    console.error('Error in watchlist GET:', error)
    return handleApiError(error)
  }
}

// POST /api/watchlist - Add media to watchlist
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) return auth.response
    
    const body = await request.json()
    console.log('Received watchlist POST request body:', body)
    
    try {
      const validatedData = watchlistCreateSchema.parse(body)
      console.log('Validated data:', validatedData)
      
      const entry = await withPrismaRetry(() =>
        prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Create or update user record
          await tx.user.upsert({
            where: { id: auth.user.uid },
            update: {},
            create: {
              id: auth.user.uid,
              email: auth.user.email,
              displayName: auth.user.name,
              photoURL: auth.user.picture,
            },
          })

          // Add media to watchlist with progress data if provided
          return tx.watchlistEntry.create({
            data: {
              userId: auth.user.uid,
              mediaId: validatedData.mediaId,
              mediaType: validatedData.mediaType,
              title: validatedData.title,
              posterPath: validatedData.posterPath,
              status: validatedData.status,
              genres: validatedData.genres,
              // Include progress tracking fields if provided
              ...(validatedData.watchedSeconds !== undefined && { watchedSeconds: validatedData.watchedSeconds }),
              ...(validatedData.totalDuration !== undefined && { totalDuration: validatedData.totalDuration }),
              ...(validatedData.lastWatched !== undefined && { lastWatched: validatedData.lastWatched }),
              // Include TV show specific fields if provided
              ...(validatedData.currentSeason !== undefined && { currentSeason: validatedData.currentSeason }),
              ...(validatedData.currentEpisode !== undefined && { currentEpisode: validatedData.currentEpisode }),
              ...(validatedData.totalSeasons !== undefined && { totalSeasons: validatedData.totalSeasons }),
              ...(validatedData.totalEpisodes !== undefined && { totalEpisodes: validatedData.totalEpisodes }),
              ...(validatedData.nextAirDate !== undefined && { nextAirDate: validatedData.nextAirDate }),
              ...(validatedData.showStatus !== undefined && { showStatus: validatedData.showStatus }),
            },
          })
        })
      )
      
      // Invalidate watchlist cache for this user
      await invalidateCache(`watchlist:userId=${auth.user.uid}*`)
      
      // Also invalidate feed cache for all users (since this update might affect their feeds)
      await invalidateCache('feed:*')
      
      console.log('Created watchlist entry:', entry)
      return successResponse({ data: entry })
    } catch (validationError) {
      console.error('Validation error:', validationError)
      return handleApiError(validationError)
    }
  } catch (error) {
    console.error('Error in watchlist POST:', error)
    return handleApiError(error)
  }
}

type DeleteParams = {
  params: Promise<{
    entryId: string
  }>
}

// DELETE /api/watchlist/:entryId - Remove media from watchlist
export async function DELETE(request: NextRequest, { params }: DeleteParams) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) return auth.response

    const { entryId } = await params

    await prisma.watchlistEntry.deleteMany({
      where: {
        id: entryId,
        userId: auth.user.uid,
      },
    })
    
    // Invalidate watchlist cache for this user
    await invalidateCache(`watchlist:userId=${auth.user.uid}*`)
    
    // Also invalidate feed cache for all users (since this deletion might affect their feeds)
    await invalidateCache('feed:*')

    return successResponse({ data: { success: true } })
  } catch (error) {
    console.error('Error in watchlist DELETE:', error)
    return handleApiError(error)
  }
} 