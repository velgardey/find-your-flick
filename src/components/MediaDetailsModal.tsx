'use client'
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { LuX, LuStar, LuCalendar, LuClock, LuLanguages } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import RetryImage from './ui/RetryImage';
import { ErrorBoundary } from 'react-error-boundary';
import TVShowProgress from './TVShowProgress';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { MovieDetails, TVShowDetails, MediaDetails, Provider, StreamingData, MediaVideo } from '@/types/media';

// Helper function to normalize provider names
const normalizeProviderName = (name: string): string => {
  const nameMap: { [key: string]: string } = {
    'Disney+': 'Disney Plus',
    'Disney+ Hotstar': 'Disney Plus',
    'Hotstar': 'Disney Plus',
    'Prime Video': 'Amazon Prime Video',
    'Amazon Video': 'Amazon Prime Video',
    'Amazon Prime': 'Amazon Prime Video',
    'Apple TV+': 'Apple TV',
    'Apple TV Plus': 'Apple TV',
    'Apple iTunes': 'Apple TV',
    'iTunes': 'Apple TV',
    'JioCinema': 'Jio Cinema',
    'Jio Cinema': 'Jio Cinema',
    'YouTube Movies': 'YouTube',
    'YouTube Premium': 'YouTube',
    'Google Play Movies': 'Google Play',
    'Play Movies': 'Google Play',
    'Google TV': 'Google Play',
    'Google Play Movies & TV': 'Google Play',
    'Tata Play': 'Tata Play',
    'SonyLIV': 'SonyLIV',
    'Sony Liv': 'SonyLIV',
    'Sony LIV': 'SonyLIV',
    'Zee5': 'Zee5',
    'ZEE5': 'Zee5',
    'Voot': 'Voot',
    'Voot Select': 'Voot',
    'Sun Nxt': 'Sun NXT',
    'SunNXT': 'Sun NXT',
    'SUNNXT': 'Sun NXT',
    'MUBI': 'Mubi',
    'Eros Now': 'Eros Now',
    'ErosNow': 'Eros Now',
    'MX Player': 'MX Player',
    'MXPlayer': 'MX Player',
    'BookMyShow': 'BookMyShow Stream',
    'BookMyShow Stream': 'BookMyShow Stream',
    'Aha': 'Aha',
    'ahaTV': 'Aha',
    'aha': 'Aha'
  };
  return nameMap[name] || name;
};

// Updated streaming service URLs with verified working patterns for India
const STREAMING_URLS: { [key: string]: (title: string, mediaType: 'movie' | 'tv') => string } = {
  'Netflix': (title) => 
    `https://www.netflix.com/in/search?q=${encodeURIComponent(title)}`,
  'Amazon Prime Video': (title) => 
    `https://www.primevideo.com/region/in/search/ref=atv_sr_sug_4?phrase=${encodeURIComponent(title)}&ie=UTF8`,
  'Disney Plus': (title) => 
    `https://www.hotstar.com/in/search?q=${encodeURIComponent(title)}&utm_source=search`,
  'SonyLIV': (title) => 
    `https://www.sonyliv.com/search?searchTerm=${encodeURIComponent(title)}`,
  'Zee5': (title) => 
    `https://www.zee5.com/search?q=${encodeURIComponent(title)}`,
  'Voot': (title) => 
    `https://www.voot.com/search?q=${encodeURIComponent(title)}`,
  'Jio Cinema': (title) => 
    `https://www.jiocinema.com/search/${encodeURIComponent(title.toLowerCase())}`,
  'Apple TV': (title) => 
    `https://tv.apple.com/in/search?term=${encodeURIComponent(title)}`,
  'Aha': (title) => 
    `https://www.aha.video/list/search?q=${encodeURIComponent(title)}`,
  'Sun NXT': (title) => 
    `https://www.sunnxt.com/search?q=${encodeURIComponent(title)}`,
  'Mubi': (title) => 
    `https://mubi.com/en/in/search/${encodeURIComponent(title.toLowerCase())}`,
  'YouTube': (title, mediaType) => 
    `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + (mediaType === 'tv' ? 'tv series' : mediaType))}`,
  'Google Play': (title, mediaType) => 
    `https://play.google.com/store/search?q=${encodeURIComponent(title + ' ' + (mediaType === 'tv' ? 'tv show' : mediaType))}&c=${mediaType === 'tv' ? 'tv' : 'movies'}`,
  'Tata Play': (title) => 
    `https://watch.tataplay.com/search?q=${encodeURIComponent(title)}`,
  'BookMyShow Stream': (title) => 
    `https://in.bookmyshow.com/stream/search/${encodeURIComponent(title.toLowerCase())}`,
  'Eros Now': (title) => 
    `https://erosnow.com/search?q=${encodeURIComponent(title)}`,
  'MX Player': (title) => 
    `https://www.mxplayer.in/search?q=${encodeURIComponent(title)}`,
};

interface MediaDetailsModalProps {
  mediaId: number | null;
  mediaType: 'movie' | 'tv' | null;
  onClose: () => void;
  layoutId?: string;
}

const getMediaDate = (media: MediaDetails | null): string | null => {
  if (!media) return null;
  switch (media.media_type) {
    case 'movie': {
      const movieMedia = media as MovieDetails;
      return movieMedia.release_date || null;
    }
    case 'tv': {
      const tvMedia = media as TVShowDetails;
      return tvMedia.first_air_date || null;
    }
    default:
      return null;
  }
};

const getMediaDuration = (media: MediaDetails | null): string => {
  if (!media) return 'N/A';
  switch (media.media_type) {
    case 'movie': {
      const movieMedia = media as MovieDetails;
      return movieMedia.runtime ? `${movieMedia.runtime} minutes` : 'N/A';
    }
    case 'tv': {
      const tvMedia = media as TVShowDetails;
      if (!tvMedia.episode_run_time?.length) return 'N/A';
      const avgDuration = Math.round(
        tvMedia.episode_run_time.reduce((a, b) => a + b, 0) / tvMedia.episode_run_time.length
      );
      return `${avgDuration} minutes per episode`;
    }
    default:
      return 'N/A';
  }
};

export default function MediaDetailsModal({ mediaId, mediaType, onClose, layoutId }: MediaDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<MediaDetails | null>(null);
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getWatchlistEntry } = useWatchlist();
  const watchlistEntry = mediaId ? getWatchlistEntry(mediaId) : undefined;

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchMediaData = async () => {
      if (!mediaId || !mediaType) {
        return; // Early return if either mediaId or mediaType is null
      }
      
      setIsLoading(true);
      setMedia(null);
      setVideos([]);
      setStreamingData(null);
      
      try {
        // Fetch media details
        const mediaResponse = await fetch(
          `/api/tmdb?path=/${mediaType}/${mediaId}?language=en-US`,
          { signal: controller.signal }
        );
        
        if (!mediaResponse.ok) {
          throw new Error(`Failed to fetch media details: ${mediaResponse.status}`);
        }
        
        const mediaData = await mediaResponse.json();

        if (isMounted) {
          setMedia({
            ...mediaData,
            title: mediaData.title || mediaData.name,
            media_type: mediaType
          });
        }

        // Fetch videos
        const videosResponse = await fetch(
          `/api/tmdb?path=/${mediaType}/${mediaId}/videos?language=en-US`,
          { signal: controller.signal }
        );
        
        if (!videosResponse.ok) {
          throw new Error(`Failed to fetch videos: ${videosResponse.status}`);
        }
        
        const videosData = await videosResponse.json();

        if (isMounted) {
          setVideos(videosData.results?.filter((video: MediaVideo) => 
            video.site.toLowerCase() === 'youtube' && 
            ['Trailer', 'Teaser'].includes(video.type)
          ) || []);
        }

        // Fetch streaming data
        const streamingResponse = await fetch(
          `/api/tmdb?path=/${mediaType}/${mediaId}/watch/providers`,
          { signal: controller.signal }
        );
        
        if (!streamingResponse.ok) {
          throw new Error(`Failed to fetch streaming data: ${streamingResponse.status}`);
        }
        
        const streamingData = await streamingResponse.json();

        if (isMounted) {
          setStreamingData(streamingData.results?.IN || null);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        console.error('Error fetching media data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMediaData();

    return () => {
      isMounted = false;
      controller.abort();
      setMedia(null);
      setVideos([]);
      setStreamingData(null);
      setIsLoading(false);
    };
  }, [mediaId, mediaType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (mediaId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [mediaId, onClose]);

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
                    href={streamingUrl(media?.title || '', media?.media_type || 'movie')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                    onClick={(e) => {
                      if (!media?.title) {
                        e.preventDefault();
                        return;
                      }
                      console.log(`Clicked ${normalizedName} link:`, streamingUrl(media.title, media.media_type));
                    }}
                  >
                    <Image
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.style.backgroundColor = '#1a1a1a';
                          const fallback = document.createElement('div');
                          fallback.className = 'absolute inset-0 flex items-center justify-center text-white/50 text-xs text-center p-1';
                          fallback.textContent = provider.provider_name.slice(0, 2).toUpperCase();
                          target.parentElement.appendChild(fallback);
                        }
                      }}
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

  if (!mediaId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden"
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
            className="absolute top-4 right-4 z-[1100] p-2.5 rounded-lg bg-black/80 hover:bg-black/60 active:bg-black/40 backdrop-blur-sm border border-white/10 transition-all duration-200 touch-manipulation"
          >
            <LuX className="h-6 w-6 text-gray-400 hover:text-white transition-colors" />
          </motion.button>

          {/* Full Background Backdrop */}
          {media?.backdrop_path ? (
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />
              <RetryImage
                src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`}
                alt={media.title}
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
            ) : media ? (
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
                        <ErrorBoundary fallback={
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <p className="text-white/70">Failed to load video player</p>
                          </div>
                        }>
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${videos[0].key}?rel=0&modestbranding=1&playsinline=1`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                            onError={(e) => {
                              console.error('YouTube player failed to load:', e);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </ErrorBoundary>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Media Details */}
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Poster */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative w-[120px] sm:w-[200px] flex-shrink-0 mx-auto sm:mx-0"
                    layoutId={layoutId}
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-black/30">
                      {media.poster_path ? (
                        <RetryImage
                          src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                          alt={media.title}
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
                        <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">{media.title}</h2>
                        {media.tagline && (
                          <p className="text-sm sm:text-base text-gray-400 italic mt-2 font-medium">{media.tagline}</p>
                        )}
                      </div>
                      {mediaType === 'movie' && (
                        <motion.a
                          href={`https://www.cineby.app/${mediaType}/${media.id}?play=true`}
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
                      )}
                      {mediaType === 'tv' && (
                        <motion.a
                          href={`https://www.cineby.app/${mediaType}/${media.id}?play=true`}
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
                          <span>Play TV Show</span>
                        </motion.a>
                      )}
                    </div>

                    {/* Media Stats */}
                    <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                      {media.vote_average > 0 && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 rounded-lg px-3.5 py-2 border border-yellow-500/20 transition-colors hover:bg-yellow-500/20"
                        >
                          <LuStar className="w-4 h-4" />
                          <span className="font-medium">{media.vote_average.toFixed(1)}</span>
                        </motion.div>
                      )}
                      {getMediaDate(media) && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-lg px-3.5 py-2 border border-blue-500/20 transition-colors hover:bg-blue-500/20"
                        >
                          <LuCalendar className="w-4 h-4" />
                          <span className="font-medium">
                            {new Date(getMediaDate(media)!).getFullYear()}
                          </span>
                        </motion.div>
                      )}
                      {getMediaDuration(media) !== 'N/A' && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-green-500/10 text-green-400 rounded-lg px-3.5 py-2 border border-green-500/20 transition-colors hover:bg-green-500/20"
                        >
                          <LuClock className="w-4 h-4" />
                          <span className="font-medium">{getMediaDuration(media)}</span>
                        </motion.div>
                      )}
                      {media.original_language && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-2 bg-purple-500/10 text-purple-400 rounded-lg px-3.5 py-2 border border-purple-500/20 transition-colors hover:bg-purple-500/20"
                        >
                          <LuLanguages className="w-4 h-4" />
                          <span className="font-medium">{media.original_language.toUpperCase()}</span>
                        </motion.div>
                      )}
                    </div>

                    {/* TV Show Specific Info */}
                    {mediaType === 'tv' && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        {(media as TVShowDetails).number_of_seasons && (
                          <div className="text-white">
                            <span className="text-gray-400">Seasons:</span>{' '}
                            {(media as TVShowDetails).number_of_seasons}
                          </div>
                        )}
                        {(media as TVShowDetails).number_of_episodes && (
                          <div className="text-white">
                            <span className="text-gray-400">Episodes:</span>{' '}
                            {(media as TVShowDetails).number_of_episodes}
                          </div>
                        )}
                        {(media as TVShowDetails).status && (
                          <div className="text-white">
                            <span className="text-gray-400">Status:</span>{' '}
                            {(media as TVShowDetails).status}
                            {(media as TVShowDetails).in_production && ' (In Production)'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                      {media.genres.map((genre) => (
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
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{media.overview}</p>

                    {/* TV Show Progress */}
                    {mediaType === 'tv' && (
                      <TVShowProgress 
                        show={media as TVShowDetails} 
                        watchlistEntry={watchlistEntry}
                      />
                    )}

                    {/* Streaming Providers */}
                    {(streamingData?.flatrate?.length || streamingData?.rent?.length || streamingData?.buy?.length) && (
                      <div className="space-y-4 bg-black/30 p-4 rounded-xl border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Watch Now</h3>
                        {renderProviders(streamingData?.flatrate, 'Stream')}
                        {renderProviders(streamingData?.rent, 'Rent')}
                        {renderProviders(streamingData?.buy, 'Buy')}
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Media details not found</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 