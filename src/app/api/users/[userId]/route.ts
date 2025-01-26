import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

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
            { error: 'Not authorized to view this profile' },
            { status: 403 }
          );
        }
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          photoURL: true,
          email: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(user);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 