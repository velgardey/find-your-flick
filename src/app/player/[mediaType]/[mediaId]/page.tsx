'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LuArrowLeft } from 'react-icons/lu';
import { MovieDetails, TVShowDetails } from '@/types/media';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { fetchMediaDetails } from '@/lib/mediaUtils';
import { WatchStatus } from '@/lib/prismaTypes';

// Define a type for local history items
type LocalHistoryItem = {
  id: string;
  mediaId: number;
  mediaType: string;
  title: string;
  posterPath?: string;
  status?: string;
  watchedSeconds?: number;
  totalDuration?: number;
  lastWatched?: string;
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
};

// Add TypeScript declaration for window.progressUpdateTimeout
declare global {
  interface Window {
    progressUpdateTimeout: ReturnType<typeof setTimeout> | undefined;
    historyTracked?: boolean; // Flag to prevent duplicate history tracking
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
  
  const { getWatchlistEntry, updateWatchlistEntry, addToWatchlist } = useWatchlist();
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
        
        // Always track watch progress, even if not in watchlist
        if (event.data.id === mediaId) {
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
                    if (watchlistEntry && watchlistEntry.status === WatchStatus.WATCHING) {
                      updates.status = WatchStatus.WATCHED;
                    }
                  }
                }
                
                // For movies, update status if nearly complete
                if (mediaType === 'movie' && progressPercentage > 90) {
                  // Only update status if entry exists and is in WATCHING state
                  if (watchlistEntry && watchlistEntry.status === WatchStatus.WATCHING) {
                    updates.status = WatchStatus.WATCHED;
                  }
                }
                
                // Debounce updates to avoid too many API calls
                // We use a setTimeout to batch updates every 5 seconds
                if (window.progressUpdateTimeout) {
                  clearTimeout(window.progressUpdateTimeout);
                }
                
                window.progressUpdateTimeout = setTimeout(() => {
                  console.log('Saving watch progress:', {
                    mediaId,
                    mediaType,
                    updates,
                    hasWatchlistEntry: !!watchlistEntry,
                    hasMedia: !!media
                  });
                  
                  if (watchlistEntry) {
                    console.log('Updating existing watchlist entry:', watchlistEntry.id);
                    // Update existing watchlist entry
                    updateWatchlistEntry(watchlistEntry.id, updates)
                      .then(() => {
                        console.log('Successfully updated watch progress');
                      })
                      .catch(error => {
                        console.error('Failed to update watch progress:', error);
                      });
                  } else if (media) {
                    // Add to watchlist with WATCHING status if not already in watchlist
                    // Handle different properties for movies vs TV shows
                    const title = mediaType === 'movie' 
                      ? (media as MovieDetails).title 
                      : (media as TVShowDetails).name;
                    
                    console.log('Adding to watchlist with progress data:', {
                      mediaId: parseInt(mediaId as string),
                      title,
                      mediaType,
                      updates
                    });
                    
                    // Add to watchlist with progress data
                    addToWatchlist(
                      {
                        id: parseInt(mediaId as string),
                        title: title || 'Unknown Title',
                        poster_path: media.poster_path || '',
                        media_type: mediaType
                      },
                      WatchStatus.WATCHING,
                      updates // Pass the progress updates
                    )
                    .then(() => {
                      console.log('Successfully added to watchlist with progress');
                    })
                    .catch((error: Error) => {
                      console.error('Failed to add to watchlist with progress:', error);
                    });
                  } else {
                    console.error('Cannot save watch progress: no watchlist entry and no media details available');
                  }
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
  }, [mediaId, mediaType, watchlistEntry, season, episode, updateWatchlistEntry, media, addToWatchlist]);
  
  // Fetch media details on component mount
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
  
  // Track history locally without requiring authentication
  useEffect(() => {
    // Only run once when component mounts and media data is available
    if (!mediaId || !mediaType || !media) return;
    
    // Check if we've already tracked this media in this session
    const historyKey = `history-tracked-${mediaId}-${mediaType}`;
    if (sessionStorage.getItem(historyKey)) {
      console.log('History already tracked for this media in this session');
      return;
    }
    
    // Set flag to prevent duplicate tracking
    sessionStorage.setItem(historyKey, 'true');
    
    // We'll get the title and timestamp inside the update functions when needed
    
    // Get progress data from watchProgress state if available
    // We'll use these values directly in the update functions
    // Function to update local history
    const updateLocalHistory = () => {
      try {
        if (!media || !watchProgress || !watchProgress.progress) return false;
        
        const watchedTime = watchProgress.progress.watched || 0;
        const totalTime = watchProgress.progress.duration || 0;
        const progressPercentage = totalTime > 0 ? (watchedTime / totalTime) * 100 : 0;
        const lastWatched = new Date().toISOString();
        
        console.log('Tracking media view for history locally');
        
        // Get existing local history or initialize empty array
        const localHistoryStr = sessionStorage.getItem('localHistory') || '[]';
        const localHistory = JSON.parse(localHistoryStr);
        
        // Create a local history entry with progress data
        const localEntry = {
          id: `local-${mediaId}-${mediaType}`,
          mediaId: parseInt(mediaId as string),
          mediaType: mediaType,
          title: media.title || (media as TVShowDetails).name || 'Unknown Title',
          posterPath: media.poster_path || '',
          status: progressPercentage > 90 ? 'WATCHED' : 'WATCHING',
          watchedSeconds: watchedTime,
          totalDuration: totalTime,
          lastWatched: lastWatched,
          // For TV shows, include season and episode info
          ...(mediaType === 'tv' && {
            currentSeason: season ? parseInt(season) : 1,
            currentEpisode: episode ? parseInt(episode) : 1,
            totalSeasons: (media as TVShowDetails).number_of_seasons,
            totalEpisodes: (media as TVShowDetails).number_of_episodes
          })
        };
        
        // Check if this media already exists in local history
        const existingIndex = localHistory.findIndex(
          (item: LocalHistoryItem) => item.mediaId === parseInt(mediaId as string) && item.mediaType === mediaType
        );
        
        if (existingIndex >= 0) {
          // Update existing entry with new progress data
          localHistory[existingIndex] = {
            ...localHistory[existingIndex],
            lastWatched: lastWatched,
            watchedSeconds: watchedTime,
            totalDuration: totalTime,
            status: progressPercentage > 90 ? 'WATCHED' : 'WATCHING',
            // For TV shows, update season and episode info
            ...(mediaType === 'tv' && {
              currentSeason: season ? parseInt(season) : 1,
              currentEpisode: episode ? parseInt(episode) : 1,
              totalSeasons: (media as TVShowDetails).number_of_seasons,
              totalEpisodes: (media as TVShowDetails).number_of_episodes
            })
          };
        } else {
          // Add new entry to the beginning of the array
          localHistory.unshift(localEntry);
        }
        
        // Limit history to 20 items to prevent storage issues
        const limitedHistory = localHistory.slice(0, 20);
        
        // Save back to sessionStorage
        sessionStorage.setItem('localHistory', JSON.stringify(limitedHistory));
        console.log('Added to local history with progress data:', localEntry);
        return true;
      } catch (localError) {
        console.error('Error saving to local history:', localError);
        return false;
      }
    };
    
    // Function to update server history
    const updateServerHistory = async () => {
      if (!media || !watchProgress || !watchProgress.progress) return false;
      
      try {
        const watchedTime = watchProgress.progress.watched || 0;
        const totalTime = watchProgress.progress.duration || 0;
        const progressPercentage = totalTime > 0 ? (watchedTime / totalTime) * 100 : 0;
        const lastWatched = new Date().toISOString();
        const status = progressPercentage > 90 ? WatchStatus.WATCHED : WatchStatus.WATCHING;
        
        // Prepare the update data
        const updateData = {
          watchedSeconds: watchedTime,
          totalDuration: totalTime,
          lastWatched: lastWatched,
          status: status,
          // For TV shows, include season and episode info
          ...(mediaType === 'tv' && {
            currentSeason: season ? parseInt(season) : 1,
            currentEpisode: episode ? parseInt(episode) : 1,
            totalSeasons: (media as TVShowDetails).number_of_seasons,
            totalEpisodes: (media as TVShowDetails).number_of_episodes,
          })
        };
        
        // Check if the media is already in the watchlist
        const watchlistEntry = getWatchlistEntry(parseInt(mediaId as string));
        
        // If it's in the watchlist, update the entry
        if (watchlistEntry) {
          console.log('Updating existing watchlist entry with progress:', updateData);
          
          // Use direct API call to ensure all fields are updated properly
          const response = await fetch(`/api/watchlist/${watchlistEntry.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          });
          
          if (!response.ok) {
            console.error('Failed to update watchlist entry:', await response.text());
            return false;
          } else {
            console.log('Successfully updated watchlist entry with progress');
            return true;
          }
        } else {
          // If user is watching but not in watchlist, add it to watchlist with WATCHING status
          console.log('Adding media to watchlist with progress:', updateData);
          
          // Use direct API call to ensure all fields are included
          const response = await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mediaId: parseInt(mediaId as string),
              mediaType: mediaType,
              title: media.title || (media as TVShowDetails).name || 'Unknown Title',
              posterPath: media.poster_path,
              genres: media.genres?.map(g => g.name) || [],
              watchedSeconds: watchedTime,
              totalDuration: totalTime,
              lastWatched: lastWatched,
              status: status,
              // For TV shows, include season and episode info
              ...(mediaType === 'tv' && {
                currentSeason: season ? parseInt(season) : 1,
                currentEpisode: episode ? parseInt(episode) : 1,
                totalSeasons: (media as TVShowDetails).number_of_seasons,
                totalEpisodes: (media as TVShowDetails).number_of_episodes,
              })
            }),
          });
          
          if (!response.ok) {
            console.error('Failed to add media to watchlist:', await response.text());
            return false;
          } else {
            console.log('Successfully added media to watchlist with progress');
            return true;
          }
        }
      } catch (serverError) {
        console.error('Failed to update server history:', serverError);
        return false;
      }
    };
    
    // Execute both functions when we have watch progress data
    if (watchProgress && watchProgress.progress) {
      // Use a debounce mechanism to avoid too frequent updates
      if (window.progressUpdateTimeout) {
        clearTimeout(window.progressUpdateTimeout);
      }
      
      window.progressUpdateTimeout = setTimeout(() => {
        updateLocalHistory();
        updateServerHistory();
      }, 2000); // Update after 2 seconds of stable progress
    }
    
    // Cleanup on unmount
    return () => {
      if (window.progressUpdateTimeout) {
        clearTimeout(window.progressUpdateTimeout);
      }
    };
  }, [media, mediaId, mediaType, watchProgress, getWatchlistEntry, season, episode]);
  
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
