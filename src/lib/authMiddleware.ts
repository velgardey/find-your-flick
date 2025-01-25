import { NextResponse } from 'next/server';
import { adminAuth } from './firebase-admin';

export type AuthenticatedRequest = Request & {
  user: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
};

export async function authenticateRequest(request: Request): Promise<
  | { success: true; user: AuthenticatedRequest['user'] }
  | { success: false; response: NextResponse }
> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email!,
        name: decodedToken.name,
        picture: decodedToken.picture,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      ),
    };
  }
} 