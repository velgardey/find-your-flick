'use client'
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { LuEye, LuCheck, LuRefreshCw } from 'react-icons/lu';
import MovieDetailsModal from './MovieDetailsModal';
import WatchlistButton from './WatchlistButton';

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
  const [refreshingMovieId, setRefreshingMovieId] = useState<number | null>(null);

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

  const handleRefreshMovie = async (movieId: number) => {
    setRefreshingMovieId(movieId);
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
          currentRecommendations: recommendations,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get new recommendation');
      }

      const newMovie = await response.json();
      setRecommendations(
        recommendations.map((movie) =>
          movie.id === movieId ? newMovie : movie
        )
      );
    } catch (error) {
      console.error('Error refreshing movie:', error);
    } finally {
      setRefreshingMovieId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 animate-pulse"
          >
            <div className="aspect-[2/3] bg-white/10" />
            <div className="p-4">
              <div className="h-6 bg-white/10 rounded mb-2" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
      {recommendations.map((movie) => (
        <div
          key={movie.id}
          className="bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10"
        >
          <div 
            className="relative aspect-[2/3] cursor-pointer transition-transform hover:scale-[1.03] duration-200"
            onClick={() => setSelectedMovieId(movie.id)}
          >
            <Image
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold flex-1">{movie.title}</h3>
              <button
                onClick={() => handleRefreshMovie(movie.id)}
                className="shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
                disabled={refreshingMovieId === movie.id}
              >
                <LuRefreshCw
                  className={`w-5 h-5 ${
                    refreshingMovieId === movie.id ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
            <div className="mt-4">
              <WatchlistButton movie={movie} />
            </div>
          </div>
        </div>
      ))}

      {selectedMovieId && (
        <MovieDetailsModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
} 