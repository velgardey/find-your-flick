'use client';

import { useState } from 'react';
import { LuCheck, LuClock, LuEye, LuList, LuPlus, LuTrash2 } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { WatchStatus } from '@/lib/prismaTypes';

interface WatchlistButtonProps {
  media: {
    id: number;
    title: string;
    poster_path: string;
    media_type: 'movie' | 'tv';
  };
  position?: 'top' | 'bottom';
}

export default function WatchlistButton({ media, position = 'top' }: WatchlistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { addToWatchlist, removeFromWatchlist, getWatchlistEntry } = useWatchlist();
  const currentEntry = getWatchlistEntry(media.id);

  const handleStatusChange = (status: WatchStatus) => {
    addToWatchlist(media, status);
    setIsOpen(false);
  };

  const handleRemove = () => {
    removeFromWatchlist(media.id);
    setIsOpen(false);
  };

  const getButtonIcon = () => {
    if (!currentEntry) return <LuPlus className="w-4 h-4" />;
    switch (currentEntry.status) {
      case WatchStatus.PLAN_TO_WATCH:
        return <LuList className="w-4 h-4" />;
      case WatchStatus.WATCHING:
        return <LuEye className="w-4 h-4" />;
      case WatchStatus.WATCHED:
        return <LuCheck className="w-4 h-4" />;
      case WatchStatus.ON_HOLD:
        return <LuClock className="w-4 h-4" />;
      default:
        return <LuPlus className="w-4 h-4" />;
    }
  };

  const getButtonText = () => {
    if (!currentEntry) return 'Add to Watchlist';
    switch (currentEntry.status) {
      case WatchStatus.PLAN_TO_WATCH:
        return 'Plan to Watch';
      case WatchStatus.WATCHING:
        return 'Currently Watching';
      case WatchStatus.WATCHED:
        return 'Completed';
      case WatchStatus.ON_HOLD:
        return 'On Hold';
      default:
        return 'Add to Watchlist';
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors text-sm"
      >
        {getButtonIcon()}
        <span>{getButtonText()}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? -10 : 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? -10 : 10 }}
              className={`absolute ${
                position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
              } right-0 z-50 w-48 bg-black/80 backdrop-blur-xl rounded-lg shadow-lg border border-white/10 overflow-hidden`}
            >
              <div className="p-1">
                <button
                  onClick={() => handleStatusChange(WatchStatus.PLAN_TO_WATCH)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm"
                >
                  <LuList className="w-4 h-4" />
                  <span>Plan to Watch</span>
                </button>
                <button
                  onClick={() => handleStatusChange(WatchStatus.WATCHING)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm"
                >
                  <LuEye className="w-4 h-4" />
                  <span>Currently Watching</span>
                </button>
                <button
                  onClick={() => handleStatusChange(WatchStatus.WATCHED)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm"
                >
                  <LuCheck className="w-4 h-4" />
                  <span>Completed</span>
                </button>
                <button
                  onClick={() => handleStatusChange(WatchStatus.ON_HOLD)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm"
                >
                  <LuClock className="w-4 h-4" />
                  <span>On Hold</span>
                </button>
                {currentEntry && (
                  <button
                    onClick={handleRemove}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-500/20 text-red-500 transition-colors text-sm"
                  >
                    <LuTrash2 className="w-4 h-4" />
                    <span>Remove from Watchlist</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 