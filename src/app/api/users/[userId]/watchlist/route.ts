import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

interface WatchlistEntry {
  id: string;
  mediaId: number;
  title: string;
  posterPath: string | null;
  status: 'PLAN_TO_WATCH' | 'WATCHING' | 'WATCHED' | 'ON_HOLD' | 'DROPPED';
  rating: number | null;
  notes: string | null;
  createdAt: Date;
}

type Props = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(
  request: Request,
  props: Props
) {
  try {
    const params = await props.params;
    const token = await request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const currentUserId = decodedToken.uid;
      const { userId } = params;

      // Check if the current user is friends with the requested user
      if (currentUserId !== userId) {
        const friendship = await prisma.friendship.findFirst({
          where: {
            userId: currentUserId,
            friendId: userId,
          },
        });

        if (!friendship) {
          return NextResponse.json(
            { error: 'Not authorized to view this watchlist' },
            { status: 403 }
          );
        }
      }

      const watchlist = await prisma.watchlistEntry.findMany({
        where: { userId },
        orderBy: [
          { status: 'asc' },
          { updatedAt: 'desc' },
        ],
        select: {
          id: true,
          mediaId: true,
          title: true,
          posterPath: true,
          status: true,
          rating: true,
          notes: true,
          createdAt: true,
        },
      });

      // Transform dates to ISO strings for JSON serialization
      const transformedWatchlist = watchlist.map((entry: WatchlistEntry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      }));

      return NextResponse.json(transformedWatchlist);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error fetching user watchlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 