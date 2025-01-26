import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

interface FriendshipWithFriend {
  id: string;
  userId: string;
  friendId: string;
  createdAt: Date;
  friend: {
    id: string;
    displayName: string | null;
    photoURL: string | null;
    email: string;
  };
}

export async function GET(request: Request) {
  try {
    const token = await request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const userId = decodedToken.uid;

      const friendships = await prisma.friendship.findMany({
        where: { userId },
        include: {
          friend: {
            select: {
              id: true,
              displayName: true,
              photoURL: true,
              email: true,
            },
          },
        },
      });

      const friends = friendships.map((friendship: FriendshipWithFriend) => friendship.friend);
      return NextResponse.json(friends);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 