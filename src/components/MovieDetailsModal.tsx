'use client'
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { LuX, LuStar, LuCalendar, LuClock, LuLanguages } from 'react-icons/lu';

interface MovieDetails {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  genres: { id: number; name: string }[];
  original_language: string;
  tagline: string;
}

interface MovieDetailsModalProps {
  movieId: number | null;
  onClose: () => void;
}

export default function MovieDetailsModal({ movieId, onClose }: MovieDetailsModalProps) {
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMovieDetails = async () => {
      if (!movieId) return;
      
      setIsLoading(true);
      setMovie(null);
      
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`
        );
        const data = await response.json();
        if (isMounted) {
          setMovie(data);
        }
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMovieDetails();

    return () => {
      isMounted = false;
      setMovie(null);
    };
  }, [movieId]);

  const handleClose = () => {
    setMovie(null);
    onClose();
  };

  if (!movieId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-2 sm:p-8 z-50 animate-fadeIn">
      <div className="bg-gray-900 rounded-xl sm:rounded-2xl w-[95vw] sm:w-[85vw] h-[90vh] sm:h-[85vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white z-10 hover:bg-white hover:text-black p-2 rounded-full transition-colors"
        >
          <LuX size={24} />
        </button>

        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : movie ? (
          <div className="h-full">
            {/* Backdrop Image */}
            <div className="relative h-[40%]">
              {movie.backdrop_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative -mt-10 sm:-mt-20 px-4 sm:px-8 pb-4 sm:pb-8">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                {/* Poster */}
                <div className="relative w-[150px] sm:w-[200px] h-[225px] sm:h-[300px] mx-auto sm:mx-0 flex-shrink-0">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    fill
                    className="rounded-xl object-cover"
                    priority
                  />
                </div>

                {/* Details */}
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 font-sol text-center sm:text-left">{movie.title}</h2>
                  {movie.tagline && (
                    <p className="text-gray-400 italic mb-4">{movie.tagline}</p>
                  )}

                  <div className="flex gap-6 mb-6">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <LuStar />
                      <span>{movie.vote_average.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <LuCalendar />
                      <span>{new Date(movie.release_date).getFullYear()}</span>
                    </div>
                    {movie.runtime > 0 && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <LuClock />
                        <span>{movie.runtime} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                      <LuLanguages />
                      <span>{movie.original_language.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>

                  <p className="text-gray-300 leading-relaxed">{movie.overview}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Movie details not found
          </div>
        )}
      </div>
    </div>
  );
} 