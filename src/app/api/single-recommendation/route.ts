import { NextResponse } from 'next/server';
import { generateMediaRecommendations } from '@/services/gemmaService';
import { fetchWithRetry } from '@/lib/retryUtils';

interface Media {
  id: number;
  title: string;  // movie.title or tvShow.name
  name?: string;  // for TV shows
  poster_path: string;
  media_type: 'movie' | 'tv';
}

interface TMDBResponse {
  results: Media[];
}

export async function POST(request: Request) {
  try {
    const { description, selectedMedia, excludeMediaId, currentRecommendations, mediaType } = await request.json();
    
    if (!description || !selectedMedia || !Array.isArray(selectedMedia) || !mediaType || !['movie', 'tv'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Get multiple recommendations to increase chances of finding a different media
    const mediaTitles = await generateMediaRecommendations(
      description, 
      selectedMedia,
      15,
      mediaType
    );

    if (!mediaTitles.length) {
      return NextResponse.json(
        { error: 'No recommendations generated' },
        { status: 404 }
      );
    }
    
    // Create a Set of IDs to exclude (current recommendations + the media being replaced)
    const excludeIds = new Set([
      excludeMediaId,
      ...(currentRecommendations || []).map((m: Media) => m.id)
    ]);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Try each title until we find a different media
      for (const title of mediaTitles) {
        try {
          const response = await fetchWithRetry(
            `/api/tmdb?path=/search/${mediaType}?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1`,
            { signal: controller.signal },
            {
              maxRetries: 2,
              baseDelay: 500,
              maxDelay: 2000,
            }
          );
          
          if (!response.ok) {
            console.warn(`Failed to search for ${mediaType} "${title}":`, response.status);
            continue;
          }
          
          const data: TMDBResponse = await response.json();
          
          // Transform the results to include media_type and normalize title/name
          const results = data.results.map(item => ({
            ...item,
            title: item.title || item.name,
            media_type: mediaType
          }));
          
          // Find the first media that's not in our exclude set
          const newMedia = results.find(media => !excludeIds.has(media.id));
          
          if (newMedia && newMedia.id !== excludeMediaId) {
            return NextResponse.json(newMedia);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out');
          }
          console.warn(`Error searching for ${mediaType} "${title}":`, error);
          continue;
        }
      }
      
      return NextResponse.json(
        { error: `Could not find a unique ${mediaType} recommendation` },
        { status: 404 }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('Error generating single recommendation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: error instanceof Error && error.message === 'Request timed out' ? 504 : 500 }
    );
  }
} 