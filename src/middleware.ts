import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for an API route
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip authentication for public API routes
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

export const config = {
  matcher: [
    '/api/:path*',
    '/feed',
    '/friends/:path*',
    '/profile/:path*',
  ],
}; 