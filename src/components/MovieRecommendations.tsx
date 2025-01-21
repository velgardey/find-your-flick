'use client'
import Image from 'next/image';
import { useState, useEffect } from 'react';
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
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      if (!target.closest('.movie-card')) {
        setActiveCardId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  const handleCardClick = (movieId: number) => {
    setActiveCardId(activeCardId === movieId ? null : movieId);
  };

  const handleButtonClick = (
    e: React.MouseEvent,
    action: () => void,
    movieId: number
  ) => {
    e.stopPropagation();
    if (!isTouchDevice || (isTouchDevice && activeCardId === movieId)) {
      action();
      if (isTouchDevice) {
        setActiveCardId(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-center">Generating recommendations...</p>
        </div>
      </div>
    );
  }

  if (!recommendations.length) return null;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-3 font-sol">Recommended Movies</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {recommendations.map((movie, index) => (
          <div 
            key={movie.id || `temp-${index}`} 
            className="movie-card relative group touch-manipulation backdrop-blur-md bg-white/5 rounded-lg border border-white/10 shadow-lg aspect-[2/3] overflow-hidden"
            onClick={() => handleCardClick(movie.id)}
          >
            <div className="relative w-full h-full">
              {movie.poster_path ? (
                <>
                  {!loadedImages[movie.id] && (
                    <div 
                      className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-pulse rounded-lg flex items-center justify-center"
                    >
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white/80 rounded-full animate-spin" />
                    </div>
                  )}
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                    alt={movie.title}
                    fill
                    className={`object-cover transition-all duration-300 ${
                      loadedImages[movie.id] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                    onLoad={() => handleImageLoad(movie.id)}
                    onError={() => {
                      setLoadedImages(prev => ({ ...prev, [movie.id]: false }));
                    }}
                    priority={true}
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-sm text-center px-2">No Image Available</span>
                </div>
              )}
              
              {/* Hover Options */}
              <div 
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 
                  ${activeCardId === movie.id ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'}
                  ${isTouchDevice && activeCardId !== movie.id ? 'pointer-events-none' : ''}`}
              >
                <div className="flex flex-col items-center justify-center h-full gap-3 sm:gap-4 px-2 sm:px-3">
                  <button
                    onClick={(e) => 
                      handleButtonClick(e, () => setSelectedMovieId(movie.id), movie.id)
                    }
                    className="flex items-center gap-1.5 hover:bg-white/10 text-white text-xs sm:text-sm px-3 py-1.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <LuEye className="text-base" /> View Details
                  </button>
                  
                  <div className="w-3/4 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  
                  <button
                    onClick={(e) => 
                      handleButtonClick(
                        e,
                        () => handleReplaceMovie(movie.id, index),
                        movie.id
                      )
                    }
                    className="flex items-center gap-1.5 hover:bg-white/10 text-white text-xs sm:text-sm px-3 py-1.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
                    disabled={replacingMovieId === movie.id}
                  >
                    {replacingMovieId === movie.id ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LuCheck className="text-base" /> Already Watched
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-md p-2 border-t border-white/10">
              <p className="text-white text-sm font-sol line-clamp-1 text-center">{movie.title}</p>
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