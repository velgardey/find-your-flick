'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LuArrowLeft } from 'react-icons/lu';
import { MovieDetails, TVShowDetails } from '@/types/media';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { fetchMediaDetails } from '@/lib/mediaUtils';
import { WatchStatus } from '@/lib/prismaTypes';

// Add TypeScript declaration for window.progressUpdateTimeout
declare global {
  interface Window {
    progressUpdateTimeout: ReturnType<typeof setTimeout> | undefined;
  }
}

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const mediaType = params.mediaType as 'movie' | 'tv';
  const mediaId = params.mediaId as string;
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  
  const [media, setMedia] = useState<MovieDetails | TVShowDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [watchProgress, setWatchProgress] = useState<{ 
    type: string;
    id: string;
    progress?: { 
      watched: number; 
      duration: number;
    };
  } | null>(null);
  
  const { getWatchlistEntry, updateWatchlistEntry } = useWatchlist();
  const watchlistEntry = mediaId ? getWatchlistEntry(parseInt(mediaId)) : undefined;

  // Custom parameters from URL
  const autoplay = searchParams.get('autoplay') || 'true';
  const colour = searchParams.get('colour') || '00ff9d';
  const backbutton = searchParams.get('backbutton') || 'https://vidora.su/';
  const logo = searchParams.get('logo') || 'https://vidora.su/logo.png';
  const pausescreen = searchParams.get('pausescreen') || 'true';
  const autonextepisode = searchParams.get('autonextepisode') || 'true';

  // Set up event listener for Vidora watch progress updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if the message is from Vidora
      if (event.data && event.data.type === 'MEDIA_DATA') {
        console.log('Received watch progress update:', event.data);
        setWatchProgress(event.data);
        
        // Update watchlist entry if available
        if (watchlistEntry && event.data.id === mediaId) {
          const progressData = event.data;
          
          try {
            if (progressData.progress) {
              const watchedTime = progressData.progress.watched || 0;
              const totalTime = progressData.progress.duration || 0;
              const progressPercentage = totalTime > 0 ? (watchedTime / totalTime) * 100 : 0;
              
              // Common progress updates for both movies and TV shows
              // Only update if significant progress has been made (more than 5%)
              if (progressPercentage > 5) {
                // Define updates with proper typing
                const updates: {
                  watchedSeconds: number;
                  totalDuration: number;
                  lastWatched: string;
                  currentSeason?: number;
                  currentEpisode?: number;
                  status?: WatchStatus;
                } = {
                  watchedSeconds: watchedTime,
                  totalDuration: totalTime,
                  lastWatched: new Date().toISOString()
                };
                
                // For TV shows, update current season and episode
                if (mediaType === 'tv') {
                  const currentSeason = season ? parseInt(season) : 1;
                  const currentEpisode = episode ? parseInt(episode) : 1;
                  
                  updates.currentSeason = currentSeason;
                  updates.currentEpisode = currentEpisode;
                  
                  // If progress is more than 90%, mark as watched and increment episode
                  if (progressPercentage > 90) {
                    updates.currentEpisode = currentEpisode + 1;
                    
                    // If status is WATCHING, update it to reflect progress
                    if (watchlistEntry.status === WatchStatus.WATCHING) {
                      updates.status = WatchStatus.WATCHED;
                    }
                  }
                }
                
                // For movies, update status if nearly complete
                if (mediaType === 'movie' && progressPercentage > 90 && watchlistEntry.status === WatchStatus.WATCHING) {
                  updates.status = WatchStatus.WATCHED;
                }
                
                // Debounce updates to avoid too many API calls
                // We use a setTimeout to batch updates every 5 seconds
                if (window.progressUpdateTimeout) {
                  clearTimeout(window.progressUpdateTimeout);
                }
                
                window.progressUpdateTimeout = setTimeout(() => {
                  updateWatchlistEntry(watchlistEntry.id, updates)
                    .catch(error => {
                      console.error('Failed to update watch progress:', error);
                      // Show a toast or notification to the user
                      // This could be implemented with a toast library
                    });
                }, 5000);
              }
            }
          } catch (error) {
            console.error('Error processing watch progress update:', error);
          }
        }
      }
    };
    
    // Add event listener for messages from the iframe
    window.addEventListener('message', handleMessage);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [mediaId, mediaType, watchlistEntry, season, episode, updateWatchlistEntry]);
  
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchMediaData = async () => {
      if (!mediaId || !mediaType) return;
      
      setIsLoading(true);
      
      try {
        // Use the shared utility function to fetch media details
        const mediaData = await fetchMediaDetails(mediaType, mediaId, {
          signal: controller.signal
        });

        if (isMounted) {
          // Create a properly typed object based on the mediaType
          if (mediaType === 'movie') {
            setMedia({
              ...mediaData,
              title: mediaData.title,
              media_type: 'movie'
            } as MovieDetails);
          } else {
            setMedia({
              ...mediaData,
              title: (mediaData as TVShowDetails).name,
              media_type: 'tv'
            } as TVShowDetails);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        console.error('Error fetching media data:', error);
        setIsLoading(false);
      }
    };

    fetchMediaData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [mediaId, mediaType]);

  const handleClose = () => {
    router.back();
  };

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Construct the Vidora URL based on media type
  const getVidoraUrl = () => {
    let baseUrl = '';
    const params = [];
    
    // Add media type specific parameters
    if (mediaType === 'movie') {
      baseUrl = `https://vidora.su/movie/${mediaId}`;
    } else {
      baseUrl = `https://vidora.su/tv/${mediaId}`;
      
      // Add season and episode params for TV shows
      if (season) params.push(`season=${season}`);
      if (episode) params.push(`episode=${episode}`);
    }
    
    // Add custom parameters
    if (autoplay) params.push(`autoplay=${autoplay}`);
    if (colour) params.push(`colour=${colour}`);
    if (backbutton) params.push(`backbutton=${encodeURIComponent(backbutton)}`);
    if (logo) params.push(`logo=${encodeURIComponent(logo)}`);
    if (pausescreen) params.push(`pausescreen=${pausescreen}`);
    if (autonextepisode) params.push(`autonextepisode=${autonextepisode}`);
    
    // Add resume parameter based on stored progress or current progress
    // Priority: 1. Current session progress, 2. Stored progress in database
    let resumeTime = 0;
    
    // Check current session progress first
    if (watchProgress?.progress?.watched) {
      const watchedTime = watchProgress.progress.watched;
      const totalTime = watchProgress.progress.duration || 0;
      const progressPercentage = totalTime > 0 ? (watchedTime / totalTime) * 100 : 0;
      
      // Only use if significant progress (more than 10 seconds) and not at the end (less than 95%)
      if (watchedTime > 10 && progressPercentage < 95) {
        resumeTime = watchedTime;
      }
    } 
    // If no current session progress, check database stored progress
    else if (watchlistEntry?.watchedSeconds) {
      const watchedTime = watchlistEntry.watchedSeconds;
      const totalTime = watchlistEntry.totalDuration || 0;
      const progressPercentage = totalTime > 0 ? (watchedTime / totalTime) * 100 : 0;
      
      // Only use if significant progress (more than 10 seconds) and not at the end (less than 95%)
      if (watchedTime > 10 && progressPercentage < 95) {
        resumeTime = watchedTime;
      }
    }
    
    // Add resume parameter if we have a valid resume time
    if (resumeTime > 0) {
      params.push(`resume=${Math.floor(resumeTime)}`);
    }
    
    return `${baseUrl}?${params.join('&')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col">
        {/* Header with stylized back button */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent"
        >
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 bg-black/60 hover:bg-black/80 text-white px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <LuArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Browse</span>
          </motion.button>
          
          {/* Title has been removed as requested */}
          
          {/* Empty div to maintain flex spacing */}
          <div className="w-[140px]"></div>
        </motion.div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-transparent border-white/20 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
            </div>
          </div>
        )}
        
        {/* Vidora Player */}
        {!isLoading && media && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: iframeLoaded ? 1 : 0 }}
            className="flex-1 w-full h-full relative"
          >
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="relative w-16 h-16">
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-t-transparent border-white/20 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
                </div>
              </div>
            )}
            
            {/* Watch Progress Overlay */}
            {watchProgress && watchProgress.progress && (
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${watchProgress.progress.duration > 0 ? 
                        (watchProgress.progress.watched / watchProgress.progress.duration) * 100 : 0}%` 
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>{formatTime(watchProgress.progress.watched || 0)}</span>
                  <span>{formatTime(watchProgress.progress.duration || 0)}</span>
                </div>
              </div>
            )}
            
            <iframe
              src={getVidoraUrl()}
              width="100%"
              height="100%"
              allowFullScreen
              className="w-full h-full"
              onLoad={() => setIframeLoaded(true)}
            ></iframe>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
