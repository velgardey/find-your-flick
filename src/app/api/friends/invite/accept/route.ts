import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const currentUserId = decodedToken.uid;

    const { inviteCode } = await request.json();

    // Find and validate the invite
    const invite = await prisma.friendInvite.findUnique({
      where: { code: inviteCode },
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

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invite link has expired' },
        { status: 400 }
      );
    }

    if (invite.userId === currentUserId) {
      return NextResponse.json(
        { error: 'Cannot accept your own invite link' },
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

    // Create friendships (one in each direction)
    const [friendship1, friendship2] = await prisma.$transaction([
      prisma.friendship.create({
        data: {
          userId: currentUserId,
          friendId: invite.userId,
        },
      }),
      prisma.friendship.create({
        data: {
          userId: invite.userId,
          friendId: currentUserId,
        },
      }),
    ]);

    // Delete the used invite
    await prisma.friendInvite.delete({
      where: { id: invite.id },
    });

    return NextResponse.json({
      message: 'Friend added successfully',
      friendships: [friendship1, friendship2],
    });
  } catch (error) {
    console.error('Error accepting friend invite:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 