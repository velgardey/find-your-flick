import { prisma, withPrismaRetry } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/authMiddleware'
import { 
  successResponse, 
  handleApiError, 
  badRequestResponse 
} from '@/lib/apiResponse'
import { watchlistCreateSchema } from '@/lib/validationSchemas'
import { Prisma } from '@prisma/client'

// GET /api/watchlist - Get user's watchlist
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) return auth.response

    // Get search query from URL params
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')?.toLowerCase()

    const watchlist = await withPrismaRetry(() => 
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

    return successResponse(watchlist)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/watchlist - Add movie to watchlist
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) return auth.response
    
    const body = await request.json()
    const validatedData = watchlistCreateSchema.parse(body)

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

        // Add movie to watchlist
        return tx.watchlistEntry.create({
          data: {
            userId: auth.user.uid,
            movieId: validatedData.movieId,
            title: validatedData.title,
            posterPath: validatedData.posterPath,
            status: validatedData.status,
          },
        })
      })
    )

    return successResponse(entry)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/watchlist - Remove movie from watchlist
export async function DELETE(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) return auth.response
    
    const { searchParams } = new URL(request.url)
    const movieId = searchParams.get('movieId')

    if (!movieId || isNaN(parseInt(movieId))) {
      return badRequestResponse('Valid movie ID is required')
    }

    await prisma.watchlistEntry.deleteMany({
      where: {
        userId: auth.user.uid,
        movieId: parseInt(movieId),
      },
    })

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
} 