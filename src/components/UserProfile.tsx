'use client'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { WatchStatus } from '@/lib/prismaTypes';
import type { UserProfile } from '@/lib/types';
import Image from 'next/image';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { LuSearch, LuInfo, LuFilm, LuTv } from 'react-icons/lu';
import MediaDetailsModal from '@/components/MediaDetailsModal';
import { fetchWithRetry } from '@/lib/retryUtils';
import WatchlistButton from './WatchlistButton';
import UserStats from './UserStats';
import Link from 'next/link';
import clsx from 'clsx';

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
  const [selectedStatus, setSelectedStatus] = useState<WatchStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv'>('movie');
  const [touchedItemId, setTouchedItemId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showMovies, setShowMovies] = useState(true);
  const [showShows, setShowShows] = useState(true);

  const sortOptions = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    aToZ: 'A to Z',
    zToA: 'Z to A',
  };

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

  const filteredWatchlist = watchlist
    .filter(entry => {
      // First apply media type filter
      if (!showMovies && !showShows) return false;
      if (!showMovies && entry.mediaType === 'movie') return false;
      if (!showShows && entry.mediaType === 'tv') return false;

      // Then apply status filter
      if (selectedStatus !== 'ALL' && entry.status !== selectedStatus) return false;

      // Finally apply search filter
      if (searchQuery && !entry.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'aToZ':
          return a.title.localeCompare(b.title);
        case 'zToA':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

  const handleCardTouch = (itemId: string, event: React.MouseEvent) => {
    if (window.matchMedia('(hover: hover)').matches) return;
    
    event.preventDefault();
    setTouchedItemId(touchedItemId === itemId ? null : itemId);
  };

  const handleMediaClick = (mediaId: number, mediaType: 'movie' | 'tv', entryId: string, event: React.MouseEvent) => {
    if (!window.matchMedia('(hover: hover)').matches) {
      event.preventDefault();
      event.stopPropagation();
      if (touchedItemId !== entryId) {
        handleCardTouch(entryId, event);
        return;
      }
    }
    setSelectedMediaId(mediaId);
    setSelectedMediaType(mediaType);
  };

  // Close touch overlay when clicking outside
  useEffect(() => {
    if (!touchedItemId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.media-card')) {
        setTouchedItemId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [touchedItemId]);

  // Add click outside handling for search dropdown
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  // Add click outside handler for sort dropdown
  useEffect(() => {
    if (!isSortOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.sort-dropdown')) {
        setIsSortOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSortOpen]);

  // Add new search bar component
  const SearchBarComponent = () => (
    <div className="relative w-full">
      <div className={clsx(
        "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200",
        "bg-black/40 hover:bg-black/50 focus-within:bg-black/50",
        "border border-white/10 focus-within:border-purple-500/50",
        "shadow-lg backdrop-blur-sm group"
      )}>
        <LuSearch className="w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your watchlist..."
          className={clsx(
            "w-full bg-transparent text-white placeholder-gray-400",
            "text-base focus:outline-none",
            "appearance-none touch-manipulation"
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  // Add new sort controls component
  const SortControlsComponent = () => (
    <div className="relative sort-dropdown">
      <motion.button
        onClick={() => setIsSortOpen(!isSortOpen)}
        className={clsx(
          "h-12 px-4 rounded-xl text-sm font-medium",
          "bg-black/40 hover:bg-black/50",
          "border border-white/10 hover:border-white/20",
          "text-white flex items-center gap-3 transition-all",
          "active:scale-95 touch-manipulation shadow-lg backdrop-blur-sm"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        <span className="whitespace-nowrap">
          {sortOptions[sortOption as keyof typeof sortOptions]}
        </span>
      </motion.button>

      <AnimatePresence>
        {isSortOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/10 overflow-hidden z-50"
          >
            {Object.entries(sortOptions).map(([key, label]) => (
              <motion.button
                key={key}
                onClick={() => {
                  setSortOption(key);
                  setIsSortOpen(false);
                }}
                className={clsx(
                  "w-full h-12 px-4 text-left hover:bg-white/10 transition-colors flex items-center gap-3",
                  sortOption === key ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                )}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-sm">{label}</span>
                {sortOption === key && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <LayoutGroup>
        {/* Profile Card with Glassmorphism */}
        <motion.div 
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-50" />
          <div className="relative flex flex-col items-center gap-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-lg opacity-50" />
              <div className="relative w-32 h-32">
                <MotionImage
                  src={user.photoURL || '/default-avatar.png'}
                  alt="Profile"
                  fill
                  className="rounded-full object-cover relative ring-2 ring-white/20"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  priority={true}
                  sizes="(max-width: 768px) 128px, 128px"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.src !== '/default-avatar.png') {
                      img.src = '/default-avatar.png';
                    }
                  }}
                />
              </div>
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
                  whileTap={{ scale: 0.95 }}
                  className="h-10 bg-white/10 hover:bg-white/20 text-white px-3 rounded-lg disabled:opacity-50 transition-all active:scale-95 touch-manipulation text-sm"
                >
                  {loading ? 'Saving...' : 'Save'}
                </motion.button>
              </motion.div>
            ) : (
              <div className="group relative inline-flex items-center justify-center gap-2">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xl font-medium text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                >
                  {username}
                </motion.span>
                <motion.button
                  onClick={() => setIsEditing(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 touch-manipulation"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        {/* User Stats Section */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-blue-500/5 rounded-2xl" />
          <UserStats />
        </motion.div>

        {/* Watchlist Section */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-8"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
              >
                Watchlist
              </motion.h2>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMovies(!showMovies)}
                  className={clsx(
                    "p-3 rounded-xl text-sm font-medium transition-all",
                    "backdrop-blur-sm shadow-lg",
                    showMovies 
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                      : "bg-black/40 text-gray-400 hover:bg-black/50 border border-white/10",
                    (!showMovies && !showShows) && "bg-red-500/20 text-red-400 border-red-500/30"
                  )}
                  title={showMovies ? "Hide Movies" : "Show Movies"}
                >
                  <LuFilm className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShows(!showShows)}
                  className={clsx(
                    "p-3 rounded-xl text-sm font-medium transition-all",
                    "backdrop-blur-sm shadow-lg",
                    showShows 
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                      : "bg-black/40 text-gray-400 hover:bg-black/50 border border-white/10",
                    (!showMovies && !showShows) && "bg-red-500/20 text-red-400 border-red-500/30"
                  )}
                  title={showShows ? "Hide TV Shows" : "Show TV Shows"}
                >
                  <LuTv className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-4 items-start">
              <SearchBarComponent />
              <SortControlsComponent />
            </div>

            <motion.div 
              layout
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20"
            >
              {['ALL', ...Object.keys(watchStatusLabels)].map((status) => (
                <motion.button
                  key={status}
                  onClick={() => setSelectedStatus(status as WatchStatus | 'ALL')}
                  className={clsx(
                    "px-4 py-2.5 rounded-xl whitespace-nowrap transition-all",
                    "backdrop-blur-sm shadow-lg",
                    selectedStatus === status
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-black/40 hover:bg-black/50 text-gray-300 border border-white/10'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {status === 'ALL' ? 'All' : watchStatusLabels[status as WatchStatus]}
                </motion.button>
              ))}
            </motion.div>
          </div>

          {watchlistLoading ? (
            <div className="flex justify-center py-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full"
              />
            </div>
          ) : filteredWatchlist.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center py-8 space-y-6"
            >
              {searchQuery ? (
                <p className="text-gray-400">No items found matching your search.</p>
              ) : selectedStatus === 'ALL' ? (
                <>
                  <p className="text-gray-400">No items in your watchlist yet.</p>
                  <Link href="/" passHref>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <LuFilm className="w-5 h-5" />
                      <span>Discover Movies</span>
                    </motion.button>
                  </Link>
                </>
              ) : (
                <p className="text-gray-400">
                  No items in {watchStatusLabels[selectedStatus as WatchStatus].toLowerCase()}.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 mt-4"
            >
              {filteredWatchlist.map(media => (
                <motion.div
                  key={media.id}
                  variants={item}
                  className="media-card relative group"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                    {media.posterPath ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${media.posterPath}`}
                        alt={media.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement?.classList.add('bg-gray-800');
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-400 text-sm text-center px-4">No poster available</span>
                      </div>
                    )}
                    <div 
                      onClick={(e) => handleMediaClick(media.mediaId, media.mediaType, media.id, e)}
                      className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 transition-opacity duration-200 ${
                        touchedItemId === media.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <p className="text-sm font-medium text-center text-white mb-4">{media.title}</p>
                      <div className="w-full max-w-[200px] flex flex-col items-center space-y-2">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMediaId(media.mediaId);
                            setSelectedMediaType(media.mediaType);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors text-sm ${
                            !window.matchMedia('(hover: hover)').matches && touchedItemId !== media.id 
                              ? 'pointer-events-none' 
                              : ''
                          }`}
                        >
                          <LuInfo className="w-4 h-4" />
                          <span>View Details</span>
                        </motion.button>
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className={`w-full flex justify-center ${
                            !window.matchMedia('(hover: hover)').matches && touchedItemId !== media.id 
                              ? 'pointer-events-none' 
                              : ''
                          }`}
                        >
                          <WatchlistButton
                            media={{
                              id: media.mediaId,
                              title: media.title,
                              poster_path: media.posterPath || '',
                              media_type: media.mediaType
                            }}
                            position="bottom"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </LayoutGroup>

      {/* Media Details Modal */}
      <AnimatePresence>
        {selectedMediaId && (
          <MediaDetailsModal
            mediaId={selectedMediaId}
            mediaType={selectedMediaType}
            onClose={() => setSelectedMediaId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 