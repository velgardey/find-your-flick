import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{
    code: string;
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

      const { code } = params;

      const invite = await prisma.friendInvite.findUnique({
        where: { code },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      if (!invite) {
        return NextResponse.json(
          { error: 'Invalid invite code' },
          { status: 404 }
        );
      }

      if (invite.userId === currentUserId) {
        return NextResponse.json(
          { error: 'Cannot use your own invite link' },
          { status: 400 }
        );
      }

      // Check if they are already friends
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: currentUserId, friendId: invite.userId },
            { userId: invite.userId, friendId: currentUserId },
          ],
        },
      });

      if (existingFriendship) {
        return NextResponse.json(
          { error: 'Already friends with this user' },
          { status: 400 }
        );
      }

      // Check if a friend request already exists
      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: invite.userId },
            { senderId: invite.userId, receiverId: currentUserId },
          ],
        },
      });

      if (existingRequest) {
        return NextResponse.json(
          { error: 'Friend request already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        userId: invite.userId,
        userDisplayName: invite.user.displayName,
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 