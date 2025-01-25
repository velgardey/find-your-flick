import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminAuth } from '@/lib/firebase-admin';

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to fetch profile: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const updates = await request.json();

    // Validate photoURL if it's included in the update
    if (updates.photoURL && !isValidUrl(updates.photoURL) && updates.photoURL !== '/default-avatar.png') {
      return NextResponse.json(
        { error: 'The photoURL field must be a valid URL.' },
        { status: 400 }
      );
    }

    // Prepare Firebase Auth updates
    const firebaseUpdates: { displayName?: string; photoURL?: string | null } = {
      displayName: updates.username,
    };
    if ('photoURL' in updates) {
      firebaseUpdates.photoURL = updates.photoURL || null;
    }

    // Update user in Firebase Auth
    await adminAuth.updateUser(decodedToken.uid, firebaseUpdates);

    // Prepare Prisma updates
    const prismaUpdates: any = {
      displayName: updates.username,
      updatedAt: new Date(),
    };
    if ('photoURL' in updates) {
      prismaUpdates.photoURL = updates.photoURL || null;
    }

    // Update user in Prisma database
    const updatedUser = await prisma.user.update({
      where: { id: decodedToken.uid },
      data: prismaUpdates,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to update profile: ${errorMessage}` },
      { status: 500 }
    );
  }
} 