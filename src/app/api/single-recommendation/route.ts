import { NextResponse } from 'next/server';
import { generateMovieRecommendations } from '@/services/gemmaService';
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
    
    // Get multiple recommendations to increase chances of finding a different movie
    const movieTitles = await generateMovieRecommendations(
      description, 
      selectedMovies,
      15
    );
    
    // Create a Set of IDs to exclude (current recommendations + the movie being replaced)
    const excludeIds = new Set([
      excludeMovieId,
      ...currentRecommendations.map((m: Movie) => m.id)
    ]);
    
    // Try each title until we find a different movie
    for (const title of movieTitles) {
      const response = await fetchWithRetry(
        `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(title)}`,
        {},
        {
          maxRetries: 2,
          baseDelay: 500,
          maxDelay: 2000,
        }
      );
      
      if (!response.ok) {
        continue;
      }
      
      const data: TMDBResponse = await response.json();
      
      // Find the first movie that's not in our exclude set
      const newMovie = data.results.find(movie => !excludeIds.has(movie.id));
      
      if (newMovie && newMovie.id !== excludeMovieId) {
        return NextResponse.json(newMovie);
      }
    }
    
    throw new Error('Could not find a unique movie recommendation');
    
  } catch (error) {
    console.error('Error generating single recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendation' }, 
      { status: 500 }
    );
  }
} 