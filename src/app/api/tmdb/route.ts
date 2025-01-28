import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const tmdbResponse = await fetchWithRetry(
      `https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000
      }
    );

    if (!tmdbResponse.ok) {
      const errorData = await tmdbResponse.json().catch(() => ({}));
      console.error('TMDB API error:', {
        status: tmdbResponse.status,
        statusText: tmdbResponse.statusText,
        error: errorData
      });
      return NextResponse.json(
        { error: 'TMDB API error', details: errorData },
        { status: tmdbResponse.status }
      );
    }

    const data = await tmdbResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('TMDB proxy error:', error);
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out', details: error.message },
          { status: 504 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch from TMDB', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 