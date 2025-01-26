'use client'
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { LuX, LuStar, LuCalendar, LuClock, LuLanguages } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import RetryImage from './ui/RetryImage';

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

interface MovieVideo {
  key: string;
  site: string;
  type: string;
}

interface Provider {
  provider_name: string;
  logo_path: string;
}

interface StreamingData {
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
}

interface MovieDetailsModalProps {
  movieId: number | null;
  onClose: () => void;
}

export default function MovieDetailsModal({ movieId, onClose }: MovieDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [videos, setVideos] = useState<MovieVideo[]>([]);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMovieData = async () => {
      if (!movieId) return;
      
      setIsLoading(true);
      setMovie(null);
      setVideos([]);
      setStreamingData(null);
      
      try {
        // Fetch movie details
        const movieResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`
        );
        const movieData = await movieResponse.json();

        // Fetch videos
        const videosResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`
        );
        const videosData = await videosResponse.json();

        // Fetch streaming providers
        const providersResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        const providersData = await providersResponse.json();

        if (isMounted) {
          setMovie(movieData);
          setVideos(videosData.results?.filter((v: MovieVideo) => v.site === 'YouTube' && v.type === 'Trailer') || []);
          setStreamingData(providersData.results?.US || null);
        }
      } catch (error) {
        console.error('Error fetching movie data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMovieData();

    return () => {
      isMounted = false;
      setMovie(null);
      setVideos([]);
      setStreamingData(null);
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

  const renderProviders = (providers: Provider[] | undefined, title: string) => {
    if (!providers?.length) return null;
    
    return (
      <div className="mb-4">
        <h4 className="text-sm text-gray-400 mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <div
              key={provider.provider_name}
              className="relative w-8 h-8 rounded-lg overflow-hidden tooltip-trigger group"
            >
              <Image
                src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                alt={provider.provider_name}
                fill
                className="object-cover"
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {provider.provider_name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!movieId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden"
        role="dialog"
      >
        <motion.div
          ref={modalRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full sm:max-w-5xl h-[85vh] sm:h-[85vh] sm:max-h-[85vh] rounded-t-[20px] sm:rounded-2xl bg-black/90 overflow-hidden"
        >
          {/* Close Button */}
          <div className="absolute top-0 right-0 z-50 p-4">
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors"
            >
              <LuX className="w-6 h-6" />
            </button>
          </div>

          {/* Full Background Backdrop */}
          {movie?.backdrop_path ? (
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />
              <RetryImage
                src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                alt={movie.title}
                className="object-cover opacity-40"
                sizes="100vw"
                quality={85}
                priority
                maxRetries={5}
                retryDelay={1500}
              />
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/90" />
          )}

          {/* Content Container */}
          <div className="relative z-10 h-full overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse space-y-8 w-full max-w-2xl mx-auto p-6">
                  <div className="h-8 bg-white/10 rounded w-3/4" />
                  <div className="space-y-3">
                    <div className="h-4 bg-white/10 rounded w-full" />
                    <div className="h-4 bg-white/10 rounded w-5/6" />
                    <div className="h-4 bg-white/10 rounded w-4/6" />
                  </div>
                </div>
              </div>
            ) : movie ? (
              <div className="p-4 sm:p-6 space-y-6">
                {/* Video Section */}
                {videos[0] && (
                  <div className="relative w-full bg-black">
                    <div className="sm:container sm:mx-auto">
                      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.4/1]">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${videos[0].key}?rel=0&modestbranding=1&playsinline=1`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Movie Details */}
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Poster */}
                  <div className="relative w-[120px] sm:w-[200px] flex-shrink-0 mx-auto sm:mx-0">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-black/30">
                      {movie.poster_path ? (
                        <RetryImage
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          className="object-cover"
                          sizes="(max-width: 640px) 120px, 200px"
                          quality={85}
                          priority
                          maxRetries={5}
                          retryDelay={1500}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-800 rounded-xl flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No poster available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 space-y-3 sm:space-y-6">
                    {/* Title and Tagline */}
                    <div>
                      <h2 className="text-2xl sm:text-4xl font-bold text-white">{movie.title}</h2>
                      {movie.tagline && (
                        <p className="text-sm sm:text-base text-gray-400 italic mt-2">{movie.tagline}</p>
                      )}
                    </div>

                    {/* Movie Stats */}
                    <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                      {movie.vote_average > 0 && (
                        <div className="flex items-center gap-1 bg-black/30 rounded-lg px-3 py-2 touch-manipulation">
                          <LuStar className="w-4 h-4 text-yellow-500" />
                          <span>{movie.vote_average.toFixed(1)}</span>
                        </div>
                      )}
                      {movie.release_date && (
                        <div className="flex items-center gap-1 bg-black/30 rounded-lg px-3 py-2 touch-manipulation">
                          <LuCalendar className="w-4 h-4" />
                          <span>{new Date(movie.release_date).getFullYear()}</span>
                        </div>
                      )}
                      {movie.runtime > 0 && (
                        <div className="flex items-center gap-1 bg-black/30 rounded-lg px-3 py-2 touch-manipulation">
                          <LuClock className="w-4 h-4" />
                          <span>{`${movie.runtime}m`}</span>
                        </div>
                      )}
                      {movie.original_language && (
                        <div className="flex items-center gap-1 bg-black/30 rounded-lg px-3 py-2 touch-manipulation">
                          <LuLanguages className="w-4 h-4" />
                          <span>{movie.original_language.toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                      {movie.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-lg touch-manipulation"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>

                    {/* Overview */}
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{movie.overview}</p>

                    {/* Streaming Providers */}
                    <div className="space-y-4">
                      {renderProviders(streamingData?.flatrate, 'Stream')}
                      {renderProviders(streamingData?.rent, 'Rent')}
                      {renderProviders(streamingData?.buy, 'Buy')}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Movie details not found</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 