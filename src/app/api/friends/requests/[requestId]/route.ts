import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function POST(
  request: Request,
  props: Props
) {
  try {
    const params = await props.params;
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const userId = decodedToken.uid;

      const { requestId } = params;
      const { action } = await request.json();

      if (!['accept', 'reject'].includes(action)) {
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
      }

      const friendRequest = await prisma.friendRequest.findUnique({
        where: { id: requestId },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              photoURL: true,
              email: true,
            },
          },
        },
      });

      if (!friendRequest) {
        return NextResponse.json(
          { error: 'Friend request not found' },
          { status: 404 }
        );
      }

      if (friendRequest.receiverId !== userId) {
        return NextResponse.json(
          { error: 'Not authorized to handle this request' },
          { status: 403 }
        );
      }

      if (friendRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Friend request already handled' },
          { status: 400 }
        );
      }

      if (action === 'accept') {
        // Create friendship records for both users
        await prisma.$transaction([
          prisma.friendship.create({
            data: {
              userId,
              friendId: friendRequest.senderId,
            },
          }),
          prisma.friendship.create({
            data: {
              userId: friendRequest.senderId,
              friendId: userId,
            },
          }),
          prisma.friendRequest.update({
            where: { id: requestId },
            data: { status: 'ACCEPTED' },
          }),
        ]);

        return NextResponse.json(friendRequest.sender);
      } else {
        await prisma.friendRequest.update({
          where: { id: requestId },
          data: { status: 'REJECTED' },
        });

        return NextResponse.json({ status: 'rejected' });
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error handling friend request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 