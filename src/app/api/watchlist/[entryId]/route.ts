import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { prisma } from '@/lib/prisma'

// PATCH /api/watchlist/[entryId] - Update watchlist entry
export async function PATCH(
  request: Request,
  { params }: { params: { entryId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const updates = await request.json()

    // Verify ownership
    const entry = await prisma.watchlistEntry.findUnique({
      where: { id: params.entryId },
    })

    if (!entry || entry.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Update entry
    const updatedEntry = await prisma.watchlistEntry.update({
      where: { id: params.entryId },
      data: updates,
    })

    return NextResponse.json(updatedEntry)
  } catch (error) {
    console.error('Error updating watchlist entry:', error)
    return NextResponse.json(
      { error: 'Failed to update watchlist entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/watchlist/[entryId] - Remove from watchlist
export async function DELETE(
  request: Request,
  { params }: { params: { entryId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Verify ownership
    const entry = await prisma.watchlistEntry.findUnique({
      where: { id: params.entryId },
    })

    if (!entry || entry.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Delete entry
    await prisma.watchlistEntry.delete({
      where: { id: params.entryId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting watchlist entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete watchlist entry' },
      { status: 500 }
    )
  }
} 