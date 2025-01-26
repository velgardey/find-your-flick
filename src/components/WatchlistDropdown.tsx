'use client';

import { useState } from 'react';
import { LuPlus, LuCheck, LuLoader, LuList } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';

interface WatchlistDropdownProps {
  movieId: number;
  movieTitle: string;
  posterPath: string | null;
  onStatusChange?: (status: string | null) => void;
  className?: string;
}

const WATCHLIST_STATUSES = [
  { id: 'PLAN_TO_WATCH', label: 'Plan to Watch', icon: '📋' },
  { id: 'WATCHING', label: 'Watching', icon: '🎬' },
  { id: 'WATCHED', label: 'Watched', icon: '✅' },
  { id: 'ON_HOLD', label: 'On Hold', icon: '⏸️' },
  { id: 'DROPPED', label: 'Dropped', icon: '❌' },
];

export default function WatchlistDropdown({
  movieId,
  movieTitle,
  posterPath,
  onStatusChange,
  className = '',
}: WatchlistDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const { user } = useAuth();

  const handleStatusChange = async (status: string) => {
    if (!user) return;
    setIsLoading(true);

    try {
      await fetchWithAuth('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          movieId,
          title: movieTitle,
          posterPath,
          status,
        }),
      });

      setCurrentStatus(status);
      onStatusChange?.(status);
    } catch (error) {
      console.error('Error updating watchlist:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const removeFromWatchlist = async () => {
    if (!user || !currentStatus) return;
    setIsLoading(true);

    try {
      await fetchWithAuth(`/api/watchlist?movieId=${movieId}`, {
        method: 'DELETE',
      });

      setCurrentStatus(null);
      onStatusChange?.(null);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        {isLoading ? (
          <LuLoader className="w-5 h-5 animate-spin" />
        ) : currentStatus ? (
          <>
            <LuCheck className="w-5 h-5" />
            <span>{WATCHLIST_STATUSES.find(s => s.id === currentStatus)?.label}</span>
          </>
        ) : (
          <>
            <LuPlus className="w-5 h-5" />
            <span>Add to Watchlist</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-48 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl z-50 overflow-hidden"
              style={{ 
                maxHeight: 'calc(100vh - 100%)', 
                bottom: 'auto',
                top: '100%'
              }}
            >
              <div className="py-1">
                {WATCHLIST_STATUSES.map((status) => (
                  <button
                    key={status.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(status.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center space-x-2"
                  >
                    <span>{status.icon}</span>
                    <span>{status.label}</span>
                    {currentStatus === status.id && (
                      <LuCheck className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
                {currentStatus && (
                  <>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 transition-colors flex items-center space-x-2"
                    >
                      <span>🗑️</span>
                      <span>Remove</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
} 