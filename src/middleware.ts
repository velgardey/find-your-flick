import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip middleware for TMDB routes
  if (request.nextUrl.pathname.startsWith('/api/tmdb')) {
    return NextResponse.next();
  }

  // Check if the request is for an API route
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip authentication for auth routes
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // Check for Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

// Explicitly define which routes to apply middleware to, excluding /api/tmdb
export const config = {
  matcher: [
    // Protected API routes
    '/api/((?!tmdb|auth).*)',
    // Protected pages
    '/feed',
    '/friends/:path*',
    '/profile/:path*',
  ],
}; 