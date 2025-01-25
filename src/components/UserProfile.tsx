'use client'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { WatchStatus } from '@/lib/prismaTypes';
import type { UserProfile } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const watchStatusLabels: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
};

export default function UserProfile() {
  const { user } = useAuth();
  const { watchlist, isLoading: watchlistLoading } = useWatchlist();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<WatchStatus | 'ALL'>('ALL');

  const loadUserProfile = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsername(data.user.displayName || user.displayName || '');
      } else {
        // If the profile API fails, fallback to Firebase user display name
        setUsername(user.displayName || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback to Firebase user display name on error
      setUsername(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user, loadUserProfile]);

  const updateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (!username.trim()) {
        throw new Error('Username cannot be empty');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.trim(),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setUsername(data.user.displayName);
      await user.reload();
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const filteredWatchlist = selectedStatus === 'ALL'
    ? watchlist
    : watchlist.filter(entry => entry.status === selectedStatus);

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto">
      <div className="p-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32">
            <Image
              src={user.photoURL || '/default-avatar.png'}
              alt="Profile"
              fill
              className="rounded-full object-cover"
            />
          </div>

          {isEditing ? (
            <div className="flex flex-col items-center gap-2 w-full">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className="bg-black/30 text-white p-2 rounded-lg text-center w-full max-w-[250px]"
                autoFocus
              />
              <button
                onClick={updateProfile}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <div className="group relative inline-flex items-center justify-center gap-2">
              <span className="text-xl font-medium text-center">{username}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded absolute -right-8"
              >
                ✏️
              </button>
            </div>
          )}

          <button
            onClick={() => setShowWatchlist(!showWatchlist)}
            className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {showWatchlist ? 'Hide Watchlist' : 'My Watchlist'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showWatchlist && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div className="p-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedStatus('ALL')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    selectedStatus === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }`}
                >
                  All
                </button>
                {Object.entries(watchStatusLabels).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status as WatchStatus)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      selectedStatus === status
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {watchlistLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredWatchlist.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  {selectedStatus === 'ALL' 
                    ? 'No movies in your watchlist yet.'
                    : `No movies in ${watchStatusLabels[selectedStatus as WatchStatus].toLowerCase()}.`}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredWatchlist.map((movie) => (
                    <motion.div
                      key={movie.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-[2/3] rounded-lg overflow-hidden group"
                    >
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                        alt={movie.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                        <p className="text-sm font-medium text-center text-white mb-2">{movie.title}</p>
                        <span className="text-xs text-gray-300">
                          {watchStatusLabels[movie.status]}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 