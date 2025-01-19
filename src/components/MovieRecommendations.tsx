'use client'
import Image from 'next/image';
import { useState } from 'react';
import { LuEye, LuCheck } from 'react-icons/lu';
import MovieDetailsModal from './MovieDetailsModal';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface MovieRecommendationsProps {
  recommendations: Movie[];
  isLoading: boolean;
  description: string;
  selectedMovies: Movie[];
  setRecommendations: (movies: Movie[]) => void;
}

export default function MovieRecommendations({ 
  recommendations, 
  isLoading, 
  description, 
  selectedMovies,
  setRecommendations 
}: MovieRecommendationsProps) {
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [replacingMovieId, setReplacingMovieId] = useState<number | null>(null);

  if (isLoading) {
    return <div className="text-white text-center mt-8">Generating recommendations...</div>;
  }

  if (!recommendations.length) return null;

  const handleImageLoad = (movieId: number) => {
    setLoadedImages(prev => ({ ...prev, [movieId]: true }));
  };

  const handleReplaceMovie = async (movieId: number, index: number) => {
    setReplacingMovieId(movieId);
    try {
      const response = await fetch('/api/single-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          selectedMovies,
          excludeMovieId: movieId,
          currentRecommendations: recommendations
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get new movie');
      }

      const newMovie = await response.json();
      
      if (newMovie.error || !newMovie.id || newMovie.id === movieId) {
        throw new Error(newMovie.error || 'Invalid movie data received');
      }

      const newRecommendations = [...recommendations];
      newRecommendations[index] = newMovie;
      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Error replacing movie:', error);
    } finally {
      setReplacingMovieId(null);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-white mb-4 font-sol">Recommended Movies</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {recommendations.map((movie, index) => (
          <div 
            key={movie.id || `temp-${index}`} 
            className="relative group"
          >
            <div 
              className="relative"
            >
              {movie.poster_path ? (
                <>
                  {!loadedImages[movie.id] && (
                    <div 
                      className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg flex items-center justify-center"
                    >
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                    alt={movie.title}
                    width={171}
                    height={256}
                    className={`rounded-lg transition-opacity duration-300 ${
                      loadedImages[movie.id] ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => handleImageLoad(movie.id)}
                    onError={() => {
                      setLoadedImages(prev => ({ ...prev, [movie.id]: false }));
                    }}
                    priority={true}
                  />
                  
                  {/* Hover Options */}
                  <div className="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMovieId(movie.id);
                      }}
                      className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <LuEye /> View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplaceMovie(movie.id, index);
                      }}
                      className="flex items-center gap-2 bg-transparent border border-white text-white px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors"
                      disabled={replacingMovieId === movie.id}
                    >
                      {replacingMovieId === movie.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <LuCheck /> Already Watched
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-[171px] h-[256px] bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 text-sm text-center px-2">No Image Available</span>
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2 rounded-b-lg">
              <p className="text-white text-sm font-sol">{movie.title}</p>
            </div>
          </div>
        ))}
      </div>

      <MovieDetailsModal 
        movieId={selectedMovieId}
        onClose={() => setSelectedMovieId(null)}
      />
    </div>
  );
} 