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
    const userId = decodedToken.uid;

    const { displayName, email, photoURL } = await request.json();

    // Upsert the user record
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        displayName: displayName || null,
        email: email || null,
        photoURL: photoURL || null,
        updatedAt: new Date(),
      },
      create: {
        id: userId,
        displayName: displayName || null,
        email: email || null,
        photoURL: photoURL || null,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error upserting user:', error);
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