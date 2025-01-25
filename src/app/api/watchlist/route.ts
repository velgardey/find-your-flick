import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'
import { WatchStatus } from '@/lib/prismaTypes'

// GET /api/watchlist - Get user's watchlist
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    const watchlist = await prisma.watchlistEntry.findMany({
      where: { userId: decodedToken.uid },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(watchlist)
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    )
  }
}

// POST /api/watchlist - Add movie to watchlist
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const { movieId, title, posterPath, status } = await request.json()

    // Create or update user record
    await prisma.user.upsert({
      where: { id: decodedToken.uid },
      update: {},
      create: {
        id: decodedToken.uid,
        email: decodedToken.email!,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
      },
    })

    // Add movie to watchlist
    const entry = await prisma.watchlistEntry.create({
      data: {
        userId: decodedToken.uid,
        movieId,
        title,
        posterPath,
        status: status as WatchStatus,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    )
  }
} 