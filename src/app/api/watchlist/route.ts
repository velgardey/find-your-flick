import { prisma, withPrismaRetry } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/authMiddleware'
import { 
  successResponse, 
  handleApiError
} from '@/lib/apiResponse'
import { watchlistCreateSchema } from '@/lib/validationSchemas'
import { Prisma } from '@prisma/client'
import { NextRequest } from 'next/server'

// GET /api/watchlist - Get user's watchlist
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      // Return empty watchlist for unauthenticated users
      return successResponse([])
    }

    // Get search query from URL params
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')?.toLowerCase()

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

        // Add media to watchlist
      return tx.watchlistEntry.create({
        data: {
          userId: auth.user.uid,
          mediaId: validatedData.mediaId,
          mediaType: validatedData.mediaType,
          title: validatedData.title,
          posterPath: validatedData.posterPath,
          status: validatedData.status,
          genres: validatedData.genres,
        },
      })
    })
    )

    return successResponse(entry)
  } catch (error) {
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

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
} 