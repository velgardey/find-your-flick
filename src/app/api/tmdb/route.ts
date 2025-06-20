import { NextResponse } from 'next/server';
import { fetchWithRetry } from '@/lib/retryUtils';
import { withCache, generateCacheKey, CACHE_TTL } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    // Generate cache key based on the TMDB path
    const cacheKey = generateCacheKey('tmdb', { path });
    
    // Use the withCache helper to handle caching logic
    const data = await withCache(
      cacheKey,
      CACHE_TTL.TMDB,
      async () => {
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
          const errorData = await tmdbResponse.json().catch(() => ({ 
            status_message: tmdbResponse.statusText || 'Unknown error',
            status_code: tmdbResponse.status 
          }));
          
          console.error('TMDB API error:', {
            status: tmdbResponse.status,
            statusText: tmdbResponse.statusText,
            error: errorData
          });
          
          throw new Error(errorData.status_message || 'TMDB API error');
        }

        return tmdbResponse.json();
      }
    );
    
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