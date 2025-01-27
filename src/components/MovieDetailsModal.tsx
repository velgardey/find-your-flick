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
  provider_id: number;
}

interface StreamingData {
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
}

// Helper function to normalize provider names
const normalizeProviderName = (name: string): string => {
  const nameMap: { [key: string]: string } = {
    'Disney+': 'Disney Plus',
    'Disney+ Hotstar': 'Disney Plus',
    'Hotstar': 'Disney Plus',
    'Prime Video': 'Amazon Prime Video',
    'Amazon Video': 'Amazon Prime Video',
    'Apple TV+': 'Apple TV',
    'Apple TV Plus': 'Apple TV',
    'JioCinema': 'Jio Cinema',
    'Jio Cinema': 'Jio Cinema',
    'YouTube Movies': 'YouTube',
    'Google Play Movies': 'Google Play',
    'Play Movies': 'Google Play',
    'Google TV': 'Google Play',
    'Tata Play': 'Tata Play',
    'YouTube Premium': 'YouTube',
  };
  return nameMap[name] || name;
};

// Updated streaming service URLs with verified working patterns for India
const STREAMING_URLS = {
  'Netflix': (title: string) => 
    `https://www.netflix.com/in/browse?q=${encodeURIComponent(title)}`,
  'Amazon Prime Video': (title: string) => 
    `https://www.primevideo.com/region/in/search/ref=atv_sr_sug_4?phrase=${encodeURIComponent(title)}&ie=UTF8`,
  'Disney Plus': (title: string) => 
    `https://www.hotstar.com/in/search?q=${encodeURIComponent(title)}&utm_source=search`,
  'SonyLIV': (title: string) => 
    `https://www.sonyliv.com/search?searchTerm=${encodeURIComponent(title)}`,
  'Zee5': (title: string) => 
    `https://www.zee5.com/search?q=${encodeURIComponent(title)}`,
  'Voot': (title: string) => 
    `https://www.voot.com/search?q=${encodeURIComponent(title)}`,
  'Jio Cinema': (title: string) => 
    `https://www.jiocinema.com/search/${encodeURIComponent(title.toLowerCase())}`,
  'Apple TV': (title: string) => 
    `https://tv.apple.com/in/search?term=${encodeURIComponent(title)}`,
  'Aha': (title: string) => 
    `https://www.aha.video/list/search?q=${encodeURIComponent(title)}`,
  'Sun NXT': (title: string) => 
    `https://www.sunnxt.com/search?q=${encodeURIComponent(title)}`,
  'Mubi': (title: string) => 
    `https://mubi.com/en/in/search/${encodeURIComponent(title.toLowerCase())}`,
  'YouTube': (title: string) => 
    `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' movie')}`,
  'Google Play': (title: string) => 
    `https://play.google.com/store/search?q=${encodeURIComponent(title + ' movie')}&c=movies`,
  'Tata Play': (title: string) => 
    `https://watch.tataplay.com/search?q=${encodeURIComponent(title)}`,
  'BookMyShow Stream': (title: string) => 
    `https://in.bookmyshow.com/stream/search/${encodeURIComponent(title.toLowerCase())}`,
  'Eros Now': (title: string) => 
    `https://erosnow.com/search?q=${encodeURIComponent(title)}`,
  'MX Player': (title: string) => 
    `https://www.mxplayer.in/search?q=${encodeURIComponent(title)}`,
};

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

        // Fetch India-specific streaming providers
        const providersResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        const providersData = await providersResponse.json();

        if (isMounted) {
          setMovie(movieData);
          setVideos(videosData.results?.filter((v: MovieVideo) => v.site === 'YouTube' && v.type === 'Trailer') || []);
          setStreamingData(providersData.results?.IN || null); // Use IN for India-specific data
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
          {providers.map((provider) => {
            const normalizedName = normalizeProviderName(provider.provider_name);
            const streamingUrl = STREAMING_URLS[normalizedName as keyof typeof STREAMING_URLS];
            const isConfigured = !!streamingUrl;
            
            return (
              <motion.div
                key={provider.provider_name}
                className={`relative w-12 h-12 rounded-xl overflow-hidden tooltip-trigger group transform transition-all duration-200 ${isConfigured ? 'hover:scale-110 hover:ring-2 hover:ring-white/20 hover:shadow-lg active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed hover:opacity-70'}`}
                whileHover={isConfigured ? { y: -2 } : undefined}
                whileTap={isConfigured ? { scale: 0.95 } : undefined}
              >
                {isConfigured ? (
                  <motion.a
                    href={streamingUrl(movie?.title || '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                    onClick={(e) => {
                      if (!movie?.title) {
                        e.preventDefault();
                        return;
                      }
                      console.log(`Clicked ${normalizedName} link:`, streamingUrl(movie.title));
                    }}
                  >
                    <Image
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-110"
                    />
                  </motion.a>
                ) : (
                  <Image
                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                    alt={provider.provider_name}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                )}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none">
                  <div className="bg-black/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 transform -translate-y-2 group-hover:translate-y-0">
                    <div className="text-xs font-medium whitespace-nowrap text-white/90">
                      {provider.provider_name}
                      {!isConfigured && (
                        <span className="text-white/50 ml-1">(Not configured)</span>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 transform rotate-45 w-2 h-2 bg-black/90 border-r border-b border-white/10"></div>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden"
        role="dialog"
      >
        <motion.div
          ref={modalRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative w-full sm:max-w-5xl h-[85vh] sm:h-[85vh] sm:max-h-[85vh] rounded-t-[20px] sm:rounded-2xl bg-black/90 overflow-hidden shadow-2xl border border-white/10"
        >
          {/* Close Button */}
          <motion.button
            onClick={onClose}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-4 right-4 z-50 group"
          >
            <div className="relative p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all duration-200 border border-white/10">
              <LuX className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
            </div>
          </motion.button>

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
                fill
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
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 sm:p-6 space-y-6"
              >
                {/* Video Section */}
                {videos[0] && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative w-full bg-black rounded-xl overflow-hidden"
                  >
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
                  </motion.div>
                )}

                {/* Movie Details */}
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Poster */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative w-[120px] sm:w-[200px] flex-shrink-0 mx-auto sm:mx-0"
                  >
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
                          fill
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-800 rounded-xl flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No poster available</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Details */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex-1 space-y-4 sm:space-y-6"
                  >
                    {/* Title and Play Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">{movie.title}</h2>
                        {movie.tagline && (
                          <p className="text-sm sm:text-base text-gray-400 italic mt-2 font-medium">{movie.tagline}</p>
                        )}
                      </div>
                      <motion.a
                        href={`https://www.cineby.app/movie/${movie.id}?play=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform transition-all duration-200 active:scale-95 select-none touch-manipulation"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        <span>Play Movie</span>
                      </motion.a>
                    </div>

                    {/* Movie Stats */}
                    <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                      {movie.vote_average > 0 && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 rounded-lg px-3.5 py-2 border border-yellow-500/20 transition-colors hover:bg-yellow-500/20"
                        >
                          <LuStar className="w-4 h-4" />
                          <span className="font-medium">{movie.vote_average.toFixed(1)}</span>
                        </motion.div>
                      )}
                      {movie.release_date && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-lg px-3.5 py-2 border border-blue-500/20 transition-colors hover:bg-blue-500/20"
                        >
                          <LuCalendar className="w-4 h-4" />
                          <span className="font-medium">{new Date(movie.release_date).getFullYear()}</span>
                        </motion.div>
                      )}
                      {movie.runtime > 0 && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-green-500/10 text-green-400 rounded-lg px-3.5 py-2 border border-green-500/20 transition-colors hover:bg-green-500/20"
                        >
                          <LuClock className="w-4 h-4" />
                          <span className="font-medium">{`${movie.runtime}m`}</span>
                        </motion.div>
                      )}
                      {movie.original_language && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-purple-500/10 text-purple-400 rounded-lg px-3.5 py-2 border border-purple-500/20 transition-colors hover:bg-purple-500/20"
                        >
                          <LuLanguages className="w-4 h-4" />
                          <span className="font-medium">{movie.original_language.toUpperCase()}</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                      {movie.genres.map((genre) => (
                        <motion.span
                          key={genre.id}
                          whileHover={{ scale: 1.05 }}
                          className="text-sm bg-white/5 text-white/90 px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-medium"
                        >
                          {genre.name}
                        </motion.span>
                      ))}
                    </div>

                    {/* Overview */}
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{movie.overview}</p>

                    {/* Streaming Providers with updated styling */}
                    <div className="space-y-4 bg-black/30 p-4 rounded-xl border border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-4">Watch Now</h3>
                      {renderProviders(streamingData?.flatrate, 'Stream')}
                      {renderProviders(streamingData?.rent, 'Rent')}
                      {renderProviders(streamingData?.buy, 'Buy')}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
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