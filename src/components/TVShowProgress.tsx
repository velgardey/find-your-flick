'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TVShowDetails, WatchlistEntry } from '@/types/media';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { LuChevronDown, LuPlay, LuCheck, LuClock } from 'react-icons/lu';

interface TVShowProgressProps {
  show: TVShowDetails;
  watchlistEntry?: WatchlistEntry;
}

export default function TVShowProgress({ show, watchlistEntry }: TVShowProgressProps) {
  const [selectedSeason, setSelectedSeason] = useState(watchlistEntry?.currentSeason || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(watchlistEntry?.currentEpisode || 1);
  const [isExpanded, setIsExpanded] = useState(false);
  const { updateWatchlistEntry } = useWatchlist();

  const handleProgressUpdate = async (season: number, episode: number) => {
    if (!watchlistEntry) return;

    try {
      await updateWatchlistEntry(watchlistEntry.id, {
        currentSeason: season,
        currentEpisode: episode,
        totalSeasons: show.number_of_seasons,
        totalEpisodes: show.number_of_episodes,
        showStatus: show.status,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  if (!show.seasons || show.seasons.length === 0) return null;

  const currentSeason = show.seasons.find(s => s.season_number === selectedSeason);
  const totalEpisodes = currentSeason?.episode_count || 0;

  // Calculate progress percentage
  const totalWatchedEpisodes = show.seasons.reduce((acc, season) => {
    if (season.season_number < selectedSeason) {
      return acc + season.episode_count;
    } else if (season.season_number === selectedSeason) {
      return acc + selectedEpisode;
    }
    return acc;
  }, 0);
  
  const totalShowEpisodes = show.number_of_episodes || show.seasons.reduce((acc, season) => acc + season.episode_count, 0);
  const progressPercentage = (totalWatchedEpisodes / totalShowEpisodes) * 100;

  return (
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
          <div className="text-sm text-gray-400">
            {Math.round(progressPercentage)}% Complete
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
          animate={{ width: `${progressPercentage}%` }}
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
                        setSelectedSeason(season.season_number);
                        setSelectedEpisode(1);
                        handleProgressUpdate(season.season_number, 1);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                        selectedSeason === season.season_number
                          ? 'bg-white/20 text-white shadow-lg scale-105'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:scale-105'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {season.season_number < selectedSeason ? (
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
              <div>
                <label className="block text-sm text-gray-400 mb-3 font-medium">Episode</label>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((episode) => (
                    <motion.button
                      key={episode}
                      onClick={() => {
                        // If clicking the current episode, deselect it and set to previous episode
                        if (selectedEpisode === episode) {
                          const newEpisode = Math.max(episode - 1, 0);
                          setSelectedEpisode(newEpisode);
                          handleProgressUpdate(selectedSeason, newEpisode);
                        } else {
                          setSelectedEpisode(episode);
                          handleProgressUpdate(selectedSeason, episode);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedEpisode === episode
                          ? 'bg-white/20 text-white shadow-lg scale-105'
                          : episode < selectedEpisode
                          ? 'bg-white/10 text-gray-300'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
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
  );
} 