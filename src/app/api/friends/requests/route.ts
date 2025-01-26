import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const userId = decodedToken.uid;

      const requests = await prisma.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING',
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              photoURL: true,
            },
          },
        },
      });

      return NextResponse.json(requests);
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const authenticatedUserId = decodedToken.uid;

    const { senderId, receiverId } = await request.json();
    
    // If senderId is not provided, use the authenticated user as the sender
    const actualSenderId = senderId || authenticatedUserId;
    const actualReceiverId = receiverId;

    console.log('Creating friend request:', {
      authenticatedUserId,
      actualSenderId,
      actualReceiverId,
    });

    // Ensure the authenticated user is either the sender or receiver
    if (authenticatedUserId !== actualSenderId && authenticatedUserId !== actualReceiverId) {
      return NextResponse.json(
        { error: 'Unauthorized to create this friend request' },
        { status: 403 }
      );
    }

    // Ensure both users exist in the database
    const [sender, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: actualSenderId } }),
      prisma.user.findUnique({ where: { id: actualReceiverId } }),
    ]);

    if (!sender || !receiver) {
      console.error('User not found:', { sender, receiver });
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      );
    }

    // Check if a friend request already exists
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: actualSenderId, receiverId: actualReceiverId },
          { senderId: actualReceiverId, receiverId: actualSenderId },
        ],
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Friend request already exists' },
        { status: 400 }
      );
    }

    // Check if they are already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: actualSenderId, friendId: actualReceiverId },
          { userId: actualReceiverId, friendId: actualSenderId },
        ],
      },
    });

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Already friends' },
        { status: 400 }
      );
    }

    console.log('Creating friend request in database...');
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: actualSenderId,
        receiverId: actualReceiverId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            photoURL: true,
          },
        },
      },
    });
    console.log('Friend request created:', friendRequest);

    return NextResponse.json(friendRequest);
  } catch (error) {
    console.error('Error creating friend request:', error);
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