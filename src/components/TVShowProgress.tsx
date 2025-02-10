'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TVShowDetails, WatchlistEntry } from '@/types/media';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { LuChevronDown, LuPlay, LuCheck, LuClock } from 'react-icons/lu';
import { WatchStatus } from '@/lib/prismaTypes';
import RatingModal from './RatingModal';

interface TVShowProgressProps {
  show: TVShowDetails;
  watchlistEntry?: WatchlistEntry;
}

export default function TVShowProgress({ show, watchlistEntry }: TVShowProgressProps) {
  // Initialize state from watchlistEntry if it exists
  const [selectedSeason, setSelectedSeason] = useState<number | null>(() => {
    // If we have a watchlist entry with a season, use that
    if (watchlistEntry?.currentSeason !== undefined && watchlistEntry?.currentSeason !== null) {
      return watchlistEntry.currentSeason;
    }
    // Otherwise, no season is selected
    return null;
  });

  const [selectedEpisode, setSelectedEpisode] = useState(() => {
    // If we have a watchlist entry with an episode, use that
    if (watchlistEntry?.currentEpisode !== undefined && watchlistEntry?.currentEpisode !== null) {
      return watchlistEntry.currentEpisode;
    }
    // Otherwise, start at 0
    return 0;
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const { updateWatchlistEntry } = useWatchlist();

  // Effect to sync with watchlistEntry changes
  useEffect(() => {
    if (watchlistEntry) {
      if (watchlistEntry.currentSeason !== undefined && watchlistEntry.currentSeason !== null) {
        setSelectedSeason(watchlistEntry.currentSeason);
      }
      if (watchlistEntry.currentEpisode !== undefined && watchlistEntry.currentEpisode !== null) {
        setSelectedEpisode(watchlistEntry.currentEpisode);
      }
    }
  }, [watchlistEntry]);

  // Debounced update function to prevent too many API calls
  const debouncedUpdate = async (season: number | null, episode: number) => {
    if (!watchlistEntry) return;
    
    setIsUpdating(true);
    try {
      await updateWatchlistEntry(watchlistEntry.id, {
        currentSeason: season === null ? undefined : season,
        currentEpisode: season === null ? undefined : episode,
        totalSeasons: show.number_of_seasons,
        totalEpisodes: show.number_of_episodes,
        showStatus: show.status,
        nextAirDate: show.next_episode_to_air?.air_date || undefined,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      // Revert to previous state on error
      setSelectedSeason(watchlistEntry.currentSeason || null);
      setSelectedEpisode(watchlistEntry.currentEpisode || 0);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle season selection with optimistic update
  const handleSeasonSelect = (season: number | null) => {
    if (!watchlistEntry) return;

    const newSeason = season;
    const newEpisode = season === null ? 0 : 1;
    
    // Optimistic update
    setSelectedSeason(newSeason);
    setSelectedEpisode(newEpisode);

    // Update database
    debouncedUpdate(newSeason, newEpisode);
  };

  // Handle episode selection with optimistic update
  const handleEpisodeSelect = async (episode: number) => {
    if (!watchlistEntry || selectedSeason === null || !show.seasons) return;

    // Optimistic update
    setSelectedEpisode(episode);

    // Check if this is the last episode of the last season
    const isLastSeason = selectedSeason === Math.max(...show.seasons.map(s => s.season_number));
    const isLastEpisode = episode === currentSeason?.episode_count;
    const shouldMarkAsWatched = isLastSeason && isLastEpisode && watchlistEntry.status !== WatchStatus.WATCHED;

    // Update database
    if (shouldMarkAsWatched) {
      try {
        await debouncedUpdate(selectedSeason, episode);
        await updateWatchlistEntry(watchlistEntry.id, {
          currentSeason: selectedSeason,
          currentEpisode: episode,
          status: WatchStatus.WATCHED
        });
        // Show rating modal after marking as watched
        setIsRatingModalOpen(true);
      } catch (error) {
        console.error('Error updating watchlist:', error);
      }
    } else {
      debouncedUpdate(selectedSeason, episode);
    }
  };

  if (!show.seasons || show.seasons.length === 0) return null;

  const currentSeason = selectedSeason !== null ? show.seasons.find(s => s.season_number === selectedSeason) : null;
  const totalEpisodes = currentSeason?.episode_count || 0;

  // Calculate progress percentage
  const validSeasons = show.seasons.filter(season => 
    // Only include seasons that have episodes and are either regular seasons or season 0
    season.episode_count && (season.season_number >= 0)
  );

  const totalWatchedEpisodes = validSeasons.reduce((acc, season) => {
    // If no season is selected, return 0
    if (selectedSeason === null) return acc;

    // For season 0 (specials)
    if (season.season_number === 0) {
      // Only count specials if we're currently in season 0 or have moved past it
      if (selectedSeason === 0) {
        return acc + Math.min(selectedEpisode, season.episode_count);
      } else if (selectedSeason > 0 && watchlistEntry?.currentSeason && watchlistEntry.currentSeason > 0) {
        // Count all specials if we've moved to regular seasons
        return acc + season.episode_count;
      }
      return acc;
    }
    
    // For regular seasons
    if (season.season_number < selectedSeason) {
      // Count all episodes for completed seasons
      return acc + season.episode_count;
    } else if (season.season_number === selectedSeason) {
      // Count episodes up to the selected episode in current season
      return acc + Math.min(selectedEpisode, season.episode_count);
    }
    return acc;
  }, 0);

  // Calculate total episodes from valid seasons only
  const totalShowEpisodes = validSeasons.reduce((acc, season) => 
    acc + season.episode_count, 0);

  // Ensure percentage is between 0 and 100
  const progressPercentage = Math.min(100, Math.max(0, 
    totalShowEpisodes > 0 ? (totalWatchedEpisodes / totalShowEpisodes) * 100 : 0
  ));

  // Handle rating submission
  const handleRatingSubmit = async (rating: number) => {
    if (!watchlistEntry) return;

    try {
      await updateWatchlistEntry(watchlistEntry.id, { rating });
      setIsRatingModalOpen(false);
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-gradient-to-br from-white/[0.15] to-white/[0.05] backdrop-blur-xl rounded-xl p-4 border border-white/10"
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-lg font-medium group"
        >
          <div className="flex items-center gap-3">
            <span className="text-white group-hover:text-blue-400 transition-colors">Progress Tracking</span>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-400">
                {selectedSeason !== null ? `${Math.round(progressPercentage)}% Complete` : 'Not Started'}
              </div>
              {isUpdating && (
                <div className="w-3 h-3 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
              )}
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <LuChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </motion.div>
        </button>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: selectedSeason !== null ? `${progressPercentage}%` : '0%' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-6">
                {/* Season Selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-3 font-medium">Season</label>
                  <div className="flex gap-2 flex-wrap">
                    {show.seasons.map((season) => (
                      <motion.button
                        key={season.id}
                        onClick={() => {
                          if (selectedSeason === season.season_number) {
                            handleSeasonSelect(null);
                          } else {
                            handleSeasonSelect(season.season_number);
                          }
                        }}
                        disabled={isUpdating}
                        className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                          selectedSeason === season.season_number
                            ? 'bg-white/20 text-white shadow-lg scale-105'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:scale-105'
                        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        whileHover={{ scale: isUpdating ? 1 : 1.05 }}
                        whileTap={{ scale: isUpdating ? 1 : 0.95 }}
                      >
                        {selectedSeason !== null && season.season_number < selectedSeason ? (
                          <LuCheck className="w-4 h-4" />
                        ) : season.season_number === selectedSeason ? (
                          <LuPlay className="w-4 h-4" />
                        ) : (
                          <LuClock className="w-4 h-4" />
                        )}
                        <span>{season.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Episode Selection */}
                {selectedSeason !== null && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-3 font-medium">Episode</label>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                      {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((episode) => (
                        <motion.button
                          key={episode}
                          onClick={() => {
                            if (selectedEpisode === episode) {
                              handleEpisodeSelect(Math.max(episode - 1, 0));
                            } else {
                              handleEpisodeSelect(episode);
                            }
                          }}
                          disabled={isUpdating}
                          className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            selectedEpisode === episode
                              ? 'bg-white/20 text-white shadow-lg scale-105'
                              : episode < selectedEpisode
                              ? 'bg-white/10 text-gray-300'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          whileHover={{ scale: isUpdating ? 1 : 1.05 }}
                          whileTap={{ scale: isUpdating ? 1 : 0.95 }}
                        >
                          {episode <= selectedEpisode ? (
                            <div className="flex items-center justify-center gap-1">
                              {episode === selectedEpisode ? (
                                <LuPlay className="w-3 h-3" />
                              ) : (
                                <LuCheck className="w-3 h-3" />
                              )}
                              {episode}
                            </div>
                          ) : (
                            episode
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Episode Info */}
                {show.next_episode_to_air && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-3 border-t border-white/10"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-400 font-medium">Next Episode:</span>
                      <span className="text-white">
                        {new Date(show.next_episode_to_air.air_date).toLocaleDateString()} - S
                        {show.next_episode_to_air.season_number}E{show.next_episode_to_air.episode_number}
                      </span>
                      {show.next_episode_to_air.name && (
                        <span className="text-gray-400">
                          - &quot;{show.next_episode_to_air.name}&quot;
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Show Status */}
                {show.status && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-3 border-t border-white/10"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-400 font-medium">Status:</span>
                      <span className="text-white">
                        {show.status}
                        {show.status === 'Ended' && ' (Series Completed)'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        onSubmit={handleRatingSubmit}
        mediaTitle={show.name || ''}
      />
    </>
  );
} 