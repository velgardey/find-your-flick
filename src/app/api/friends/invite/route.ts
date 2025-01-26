import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  console.log('Received invite request');
  
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header found');
      return NextResponse.json({ error: 'No Authorization header' }, { status: 401 });
    }
    console.log('Auth header found:', authHeader.substring(0, 20) + '...');

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      console.error('No token found in Authorization header');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    console.log('Token extracted successfully');

    try {
      console.log('Attempting to verify token...');
      const decodedToken = await adminAuth.verifyIdToken(token);
      const userId = decodedToken.uid;
      console.log('Token verified successfully for user:', userId);

      // First, ensure the user exists in the database
      console.log('Checking if user exists in database...');
      const user = await prisma.user.upsert({
        where: { id: userId },
        update: {
          email: decodedToken.email!,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
          updatedAt: new Date(),
        },
        create: {
          id: userId,
          email: decodedToken.email!,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
        },
      });
      console.log('User ensured in database:', user.id);

      // Generate a unique invite code
      const code = Math.random().toString(36).substring(2, 15);
      console.log('Generated invite code:', code);
      
      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      console.log('Creating invite in database...');
      const invite = await prisma.friendInvite.create({
        data: {
          code,
          userId,
          expiresAt,
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://find-your-flick.vercel.app';
      const inviteLink = `${baseUrl}/friends/invite/${invite.code}`;
      console.log('Invite created successfully:', { code, userId });

      return NextResponse.json({ inviteLink });
    } catch (error) {
      console.error('Error verifying token or creating invite:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in invite request:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 