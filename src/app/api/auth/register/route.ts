import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Create or update user in database
    const user = await prisma.user.upsert({
      where: { id: decodedToken.uid },
      update: {
        email: decodedToken.email!,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        updatedAt: new Date(),
      },
      create: {
        id: decodedToken.uid,
        email: decodedToken.email!,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error registering user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to register user: ${errorMessage}` },
      { status: 500 }
    );
  }
} 