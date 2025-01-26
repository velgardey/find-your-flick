'use client'
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import MovieDetailsModal from './MovieDetailsModal';
import WatchlistButton from './WatchlistButton';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

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
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [refreshingMovieId, setRefreshingMovieId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"]')) return;
      if (!target.closest('.movie-card')) {
        setSelectedMovieId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRefreshMovie = async (movieId: number) => {
    setRefreshingMovieId(movieId);
    try {
      const response = await fetchWithRetry('/api/single-recommendation', {
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
    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 mt-8">
      {recommendations.map((movie) => (
        <div
          key={movie.id}
          onClick={() => setSelectedMovieId(movie.id)}
          className="movie-card bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 touch-manipulation cursor-pointer"
        >
          <div 
            className="relative aspect-[2/3] transition-transform active:scale-[0.98] hover:scale-[1.03] duration-200"
          >
            <div className="absolute inset-0 bg-white/5 animate-pulse" />
            <Image
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            />
          </div>
          <div className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <h3 className="text-base sm:text-lg font-semibold flex-1 line-clamp-2">{movie.title}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshMovie(movie.id);
                }}
                className="shrink-0 p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
                disabled={refreshingMovieId === movie.id}
              >
                <LuRefreshCw
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    refreshingMovieId === movie.id ? 'animate-spin' : ''
                  }`}
                />
              </button>
            </div>
            <div className="mt-3 sm:mt-4" onClick={(e) => e.stopPropagation()}>
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