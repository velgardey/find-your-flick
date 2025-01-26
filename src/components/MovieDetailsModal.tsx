'use client'
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { LuX, LuStar, LuCalendar, LuClock, LuLanguages } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [posterLoaded, setPosterLoaded] = useState(false);

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

  const handleClose = () => {
    setMovie(null);
    onClose();
  };

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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md touch-none"
        role="dialog"
      >
        <motion.div
          ref={modalRef}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="relative w-full sm:max-w-5xl overflow-hidden h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-black/90"
        >
          {/* Full Background Backdrop */}
          {movie?.backdrop_path && (
            <div className="absolute inset-0">
              <Image
                src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                alt={movie.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black/90" />
            </div>
          )}

          {/* Content Container */}
          <div className="relative h-full">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors z-50 touch-manipulation"
            >
              <LuX className="w-6 h-6" />
            </button>

            {/* Main Content */}
            <div className="h-full overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              {/* Video Section */}
              {videos[0] && (
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${videos[0].key}?rel=0&modestbranding=1&playsinline=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Movie Details */}
              <div className="p-4 sm:p-6">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : movie ? (
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Poster */}
                    <div className="relative w-[120px] sm:w-[200px] h-[180px] sm:h-[300px] mx-auto sm:mx-0 flex-shrink-0">
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
                    <div className="flex-1 space-y-4 sm:space-y-6">
                      {/* Title and Tagline */}
                      <div>
                        <h2 className="text-xl sm:text-4xl font-bold text-white">{movie.title}</h2>
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
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    Movie details not found
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 