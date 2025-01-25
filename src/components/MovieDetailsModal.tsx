'use client'
import { useEffect, useRef , useState} from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (movieId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [movieId, onClose]);

  const handleClose = () => {
    setMovie(null);
    onClose();
  };

  if (!movieId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] shadow-[0_0_15px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:pointer-events-none"
      >
        {movie?.backdrop_path && (
          <div className="relative h-56 w-full">
            {!backdropLoaded && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <Image
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title}
              fill
              className={`object-cover transition-opacity duration-300 ${
                backdropLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setBackdropLoaded(true)}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#00000099] via-[#00000066] to-[#00000033]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(0,0,0,0.95)]" />
          </div>
        )}

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors"
        >
          <LuX className="w-5 h-5" />
        </button>

        <div className="relative p-6 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : movie ? (
            <div className="h-full">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                {/* Poster */}
                <div className="relative w-[180px] sm:w-[220px] h-[270px] sm:h-[330px] mx-auto sm:mx-0 flex-shrink-0">
                  {!posterLoaded && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    fill
                    className={`rounded-xl object-cover transition-opacity duration-300 ${
                      posterLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setPosterLoaded(true)}
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
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Movie details not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 