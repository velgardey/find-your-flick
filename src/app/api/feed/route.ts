import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const token = await request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get all friends' IDs
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });

    if (friendships.length === 0) {
      return NextResponse.json([]);
    }

    const friendIds = friendships.map((f: { friendId: string }) => f.friendId);

    // Get recent watchlist entries from friends
    const feedItems = await prisma.watchlistEntry.findMany({
      where: {
        userId: { in: friendIds },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
          },
        },
      },
    });

    // Transform the data for the feed
    const transformedFeedItems = feedItems.map((item) => ({
      id: item.id,
      userId: item.user.id,
      userDisplayName: item.user.displayName || 'Unknown User',
      userPhotoURL: item.user.photoURL,
      movieId: item.mediaId,
      movieTitle: item.title,
      moviePosterPath: item.posterPath,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json(transformedFeedItems);
  } catch (error) {
    console.error('Error in feed route:', error);
    if (error instanceof Error && error.name === 'auth/invalid-token') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 