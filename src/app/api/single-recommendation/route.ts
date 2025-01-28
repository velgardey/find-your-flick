import { NextResponse } from 'next/server';
import { generateMediaRecommendations } from '@/services/gemmaService';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface TMDBResponse {
  results: Movie[];
}

export async function POST(request: Request) {
  try {
    const { description, selectedMovies, excludeMovieId, currentRecommendations } = await request.json();
    
    if (!description || !selectedMovies || !Array.isArray(selectedMovies)) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Get multiple recommendations to increase chances of finding a different movie
    const movieTitles = await generateMediaRecommendations(
      description, 
      selectedMovies,
      15
    );

    if (!movieTitles.length) {
      return NextResponse.json(
        { error: 'No recommendations generated' },
        { status: 404 }
      );
    }
    
    // Create a Set of IDs to exclude (current recommendations + the movie being replaced)
    const excludeIds = new Set([
      excludeMovieId,
      ...(currentRecommendations || []).map((m: Movie) => m.id)
    ]);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Try each title until we find a different movie
      for (const title of movieTitles) {
        try {
          const response = await fetchWithRetry(
            `/api/tmdb?path=/search/movie?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1`,
            { signal: controller.signal },
            {
              maxRetries: 2,
              baseDelay: 500,
              maxDelay: 2000,
            }
          );
          
          if (!response.ok) {
            console.warn(`Failed to search for movie "${title}":`, response.status);
            continue;
          }
          
          const data: TMDBResponse = await response.json();
          
          // Find the first movie that's not in our exclude set
          const newMovie = data.results?.find(movie => !excludeIds.has(movie.id));
          
          if (newMovie && newMovie.id !== excludeMovieId) {
            return NextResponse.json(newMovie);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out');
          }
          console.warn(`Error searching for movie "${title}":`, error);
          continue;
        }
      }
      
      return NextResponse.json(
        { error: 'Could not find a unique movie recommendation' },
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