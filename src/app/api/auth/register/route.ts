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
    
    // Get additional user info from Firebase Auth
    const firebaseUser = await adminAuth.getUser(decodedToken.uid);

    // Handle photoURL
    let photoURL = firebaseUser.photoURL;
    
    // If no custom photo but has a display name, use Google's default avatar URL
    if (!photoURL && firebaseUser.displayName) {
      photoURL = `https://lh3.googleusercontent.com/a/default-user=s96-c`;
    }

    // Create or update user in database
    const user = await prisma.user.upsert({
      where: { id: decodedToken.uid },
      update: {
        email: decodedToken.email!,
        displayName: firebaseUser.displayName || decodedToken.email?.split('@')[0] || 'Anonymous User',
        photoURL: photoURL || decodedToken.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firebaseUser.displayName || decodedToken.email || 'Anonymous')}`,
        updatedAt: new Date(),
      },
      create: {
        id: decodedToken.uid,
        email: decodedToken.email!,
        displayName: firebaseUser.displayName || decodedToken.email?.split('@')[0] || 'Anonymous User',
        photoURL: photoURL || decodedToken.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firebaseUser.displayName || decodedToken.email || 'Anonymous')}`,
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