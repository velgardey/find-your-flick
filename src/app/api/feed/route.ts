import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

type WatchlistEntryWithUser = {
  id: string;
  userId: string;
  movieId: number;
  title: string;
  posterPath: string | null;
  status: 'PLAN_TO_WATCH' | 'WATCHING' | 'WATCHED' | 'ON_HOLD' | 'DROPPED';
  rating: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    displayName: string | null;
    photoURL: string | null;
  };
};

export async function GET(request: Request) {
  try {
    const token = await request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
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
      const transformedFeedItems = feedItems.map((item: WatchlistEntryWithUser) => ({
        id: item.id,
        userId: item.user.id,
        userDisplayName: item.user.displayName || 'Unknown User',
        userPhotoURL: item.user.photoURL,
        movieId: item.movieId,
        movieTitle: item.title,
        moviePosterPath: item.posterPath,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      }));

      return NextResponse.json(transformedFeedItems);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 