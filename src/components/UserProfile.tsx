'use client'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { WatchStatus } from '@/lib/prismaTypes';
import type { UserProfile } from '@/lib/types';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { LuSearch, LuInfo } from 'react-icons/lu';
import WatchlistStatusDropdown from './WatchlistStatusDropdown';
import MovieDetailsModal from './MovieDetailsModal';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

const watchStatusLabels: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
};

const MotionImage = motion(Image);

export default function UserProfile() {
  const { user } = useAuth();
  const { watchlist, isLoading: watchlistLoading } = useWatchlist();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<WatchStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [touchedMovieId, setTouchedMovieId] = useState<string | null>(null);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const loadUserProfile = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const token = await user.getIdToken();
      const response = await fetchWithRetry('/api/profile', {
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
      const response = await fetchWithRetry('/api/profile', {
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

  const searchFilteredWatchlist = filteredWatchlist.filter(entry =>
    !searchQuery || entry.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add touch handling functions
  const handleCardTouch = (movieId: string, event: React.MouseEvent) => {
    // Only handle touch events, not mouse events
    if (window.matchMedia('(hover: hover)').matches) return;
    
    event.preventDefault();
    setTouchedMovieId(touchedMovieId === movieId ? null : movieId);
  };

  // Close touch overlay when clicking outside
  useEffect(() => {
    if (!touchedMovieId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.movie-card')) {
        setTouchedMovieId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [touchedMovieId]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:border-white/20 transition-colors"
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative w-32 h-32"
          >
            <MotionImage
              src={user.photoURL || '/default-avatar.png'}
              alt="Profile"
              fill
              className="rounded-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </motion.div>

          {isEditing ? (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2 w-full"
            >
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className="bg-black/30 text-white p-2 rounded-lg text-center w-full max-w-[250px] focus:ring-2 focus:ring-white/20 focus:outline-none transition-all"
                autoFocus
              />
              <motion.button
                onClick={updateProfile}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Save'}
              </motion.button>
            </motion.div>
          ) : (
            <div className="group relative inline-flex items-center justify-center gap-2">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-medium text-center"
              >
                {username}
              </motion.span>
              <motion.button
                onClick={() => setIsEditing(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-white/10 rounded absolute -right-8"
              >
                ✏️
              </motion.button>
            </div>
          )}

          <motion.button
            onClick={() => setShowWatchlist(!showWatchlist)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all"
          >
            {showWatchlist ? 'Hide Watchlist' : 'My Watchlist'}
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {showWatchlist && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mt-4 overflow-hidden"
          >
            <div className="p-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 hover:border-white/20 transition-colors">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <motion.button
                    onClick={() => setSelectedStatus('ALL')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedStatus === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-gray-300'
                    }`}
                  >
                    All
                  </motion.button>
                  {Object.entries(watchStatusLabels).map(([status, label]) => (
                    <motion.button
                      key={status}
                      onClick={() => setSelectedStatus(status as WatchStatus)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        selectedStatus === status
                          ? 'bg-white/20 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }`}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
                <div className="relative flex items-center">
                  <motion.button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-lg transition-all ${
                      isSearchOpen ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <LuSearch className="w-4 h-4" />
                  </motion.button>
                  <motion.div 
                    initial={false}
                    animate={isSearchOpen ? { 
                      opacity: 1, 
                      y: 0,
                      scale: 1,
                      pointerEvents: "auto" 
                    } : { 
                      opacity: 0, 
                      y: 10,
                      scale: 0.95,
                      pointerEvents: "none" 
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute right-0 bottom-full mb-2 z-10"
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies..."
                      className="w-[250px] sm:w-[300px] px-3 py-2 bg-black/80 backdrop-blur-xl rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400 border border-white/10 shadow-xl transition-all"
                    />
                  </motion.div>
                </div>
              </div>

              {watchlistLoading ? (
                <div className="flex justify-center py-8">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full"
                  />
                </div>
              ) : searchFilteredWatchlist.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-gray-400 py-8"
                >
                  {searchQuery 
                    ? 'No movies found matching your search.'
                    : selectedStatus === 'ALL' 
                      ? 'No movies in your watchlist yet.'
                      : `No movies in ${watchStatusLabels[selectedStatus as WatchStatus].toLowerCase()}.`}
                </motion.p>
              ) : (
                <motion.div 
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 gap-4"
                >
                  {searchFilteredWatchlist.map((movie) => (
                    <motion.div
                      key={movie.id}
                      variants={item}
                      layoutId={movie.id}
                      className="movie-card relative aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => handleCardTouch(movie.id, e)}
                    >
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Desktop hover overlay */}
                      <div 
                        className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 opacity-0 transition-all duration-200 ${
                          touchedMovieId === movie.id ? 'opacity-100' : 'group-hover:opacity-100'
                        }`}
                      >
                        <p className="text-sm font-medium text-center text-white mb-4">{movie.title}</p>
                        <div className="w-full max-w-[200px] space-y-2">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMovieId(movie.movieId);
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors text-sm"
                          >
                            <LuInfo className="w-4 h-4" />
                            <span>View Details</span>
                          </motion.button>
                          <WatchlistStatusDropdown 
                            entryId={movie.id} 
                            currentStatus={movie.status}
                            isEnabled={true}
                            movieId={movie.movieId}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedMovieId && (
        <MovieDetailsModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
} 