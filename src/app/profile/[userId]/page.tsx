"use client";

import { useEffect, useState, use } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';
import WatchlistButton from '@/components/WatchlistButton';
import MediaDetailsModal from '@/components/MediaDetailsModal';
import UserStats from '@/components/UserStats';
import TasteMatch from '@/components/TasteMatch';
import withAuth from '@/components/withAuth';
import { MagnifyingGlassIcon, FilmIcon, TvIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface UserProfile {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  email: string;
}

interface WatchlistEntry {
  id: string;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
  createdAt: string;
}

interface PageProps {
  params: Promise<{
    userId: string;
  }>;
}

function UserProfile({ params }: PageProps) {
  const { userId } = use(params);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv' | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [touchedMovieId, setTouchedMovieId] = useState<string | null>(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showMovies, setShowMovies] = useState(true);
  const [showShows, setShowShows] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const watchStatusLabels: Record<string, string> = {
    PLAN_TO_WATCH: 'Plan to Watch',
    WATCHING: 'Watching',
    WATCHED: 'Watched',
    ON_HOLD: 'On Hold',
    DROPPED: 'Dropped',
  };

  const handleCardTouch = (movieId: string, event: React.MouseEvent) => {
    if (window.matchMedia('(hover: hover)').matches) return;
    
    event.preventDefault();
    setTouchedMovieId(touchedMovieId === movieId ? null : movieId);
  };

  const handleMovieClick = (mediaId: number, mediaType: 'movie' | 'tv', entryId: string, event: React.MouseEvent) => {
    if (!window.matchMedia('(hover: hover)').matches) {
      event.preventDefault();
      event.stopPropagation();
      if (touchedMovieId !== entryId) {
        handleCardTouch(entryId, event);
        return;
      }
    }
    console.log('Setting media type:', mediaType);
    setSelectedMediaType(mediaType);
    setTimeout(() => {
      console.log('Setting media ID:', mediaId);
      setSelectedMediaId(mediaId);
    }, 0);
  };

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

  useEffect(() => {
    if (!openStatusDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown')) {
        setOpenStatusDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusDropdown]);

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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const [profileData, watchlistData] = await Promise.all([
          fetchWithAuth<UserProfile>(`/api/users/${userId}`),
          fetchWithAuth<WatchlistEntry[]>(`/api/users/${userId}/watchlist`)
        ]);

        setProfile(
          profileData && typeof profileData === 'object' 
            ? profileData as UserProfile 
            : null
        );
        setWatchlist(
          Array.isArray(watchlistData) 
            ? watchlistData 
            : []
        );
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user]);

  useEffect(() => {
    console.log('State changed - mediaId:', selectedMediaId, 'mediaType:', selectedMediaType);
  }, [selectedMediaId, selectedMediaType]);

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sign in to view profiles</h2>
          <p className="text-gray-400">You need to be signed in to view user profiles.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredWatchlist = watchlist
    .filter(movie => 
      (selectedStatus === 'ALL' || movie.status === selectedStatus) &&
      ((!showMovies && movie.mediaType === 'tv') || (!showShows && movie.mediaType === 'movie') || (showMovies && showShows)) &&
      (!searchQuery || movie.title.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'rating':
          const ratingA = a.rating ?? -1;
          const ratingB = b.rating ?? -1;
          comparison = ratingB - ratingA;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

  const SearchBar = () => (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="relative w-full">
        <div className={clsx(
          "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200",
          "bg-black/40 hover:bg-black/50 focus-within:bg-black/50",
          "border border-white/10 focus-within:border-purple-500/50",
          "shadow-lg backdrop-blur-sm group"
        )}>
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
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
      <div className="relative sort-dropdown shrink-0">
        <motion.button
          onClick={() => setIsSortOpen(!isSortOpen)}
          className={clsx(
            "h-12 px-4 rounded-xl text-sm font-medium",
            "bg-black/40 hover:bg-black/50",
            "border border-white/10 hover:border-white/20",
            "text-white flex items-center gap-3 transition-all",
            "active:scale-95 touch-manipulation shadow-lg backdrop-blur-sm",
            "w-full sm:w-auto min-w-[140px]"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div className="flex items-center gap-2">
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
              {sortBy === 'date' ? (sortOrder === 'desc' ? 'Newest First' : 'Oldest First') :
               sortBy === 'rating' ? (sortOrder === 'desc' ? 'Highest Rated' : 'Lowest Rated') :
               sortOrder === 'desc' ? 'Z to A' : 'A to Z'}
            </span>
            <motion.div
              animate={{ rotate: isSortOpen ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="ml-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isSortOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/10 overflow-hidden z-50"
            >
              <div className="py-2">
                <div className="px-3 py-2 text-xs text-gray-400 uppercase">Date Added</div>
                <motion.button
                  onClick={() => {
                    setSortBy('date');
                    setSortOrder('desc');
                    setIsSortOpen(false);
                  }}
                  className={clsx(
                    "w-full h-10 px-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3",
                    sortBy === 'date' && sortOrder === 'desc' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: 0 }}
                    className="w-4 h-4"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </motion.div>
                  <span className="text-sm">Newest First</span>
                </motion.button>
                <motion.button
                  onClick={() => {
                    setSortBy('date');
                    setSortOrder('asc');
                    setIsSortOpen(false);
                  }}
                  className={clsx(
                    "w-full h-10 px-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3",
                    sortBy === 'date' && sortOrder === 'asc' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: 180 }}
                    className="w-4 h-4"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </motion.div>
                  <span className="text-sm">Oldest First</span>
                </motion.button>

                <div className="px-3 py-2 text-xs text-gray-400 uppercase mt-2">Rating</div>
                <motion.button
                  onClick={() => {
                    setSortBy('rating');
                    setSortOrder('desc');
                    setIsSortOpen(false);
                  }}
                  className={clsx(
                    "w-full h-10 px-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3",
                    sortBy === 'rating' && sortOrder === 'desc' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-sm">Highest Rated</span>
                </motion.button>
                <motion.button
                  onClick={() => {
                    setSortBy('rating');
                    setSortOrder('asc');
                    setIsSortOpen(false);
                  }}
                  className={clsx(
                    "w-full h-10 px-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3",
                    sortBy === 'rating' && sortOrder === 'asc' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="text-sm">Lowest Rated</span>
                </motion.button>

                <div className="px-3 py-2 text-xs text-gray-400 uppercase mt-2">Alphabetical</div>
                <motion.button
                  onClick={() => {
                    setSortBy('title');
                    setSortOrder('asc');
                    setIsSortOpen(false);
                  }}
                  className={clsx(
                    "w-full h-10 px-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3",
                    sortBy === 'title' && sortOrder === 'asc' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6" />
                  </svg>
                  <span className="text-sm">A to Z</span>
                </motion.button>
                <motion.button
                  onClick={() => {
                    setSortBy('title');
                    setSortOrder('desc');
                    setIsSortOpen(false);
                  }}
                  className={clsx(
                    "w-full h-10 px-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3",
                    sortBy === 'title' && sortOrder === 'desc' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9" />
                  </svg>
                  <span className="text-sm">Z to A</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 px-4 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="space-y-8">
            <div className="animate-pulse flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-6 bg-gray-700 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-700 rounded w-1/3" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] bg-gray-700 rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : profile ? (
          <LayoutGroup>
            {/* Profile Header with Glassmorphism */}
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl mb-12 bg-white/5 backdrop-blur-lg border border-white/10 p-8"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-50" />
              <div className="relative flex flex-col sm:flex-row items-center gap-6 p-4 sm:p-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-lg opacity-50" />
                  <div className="relative">
                    {profile.photoURL ? (
                      <Image
                        src={profile.photoURL}
                        alt={profile.displayName || 'User'}
                        width={96}
                        height={96}
                        className="rounded-full ring-2 ring-white/20"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center ring-2 ring-white/20">
                        <span className="text-2xl text-white/60">
                          {profile.displayName?.[0] || profile.email[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold break-words max-w-[250px] sm:max-w-none">
                    {profile.displayName || 'Anonymous User'}
                  </h1>
                  <p className="text-gray-400 break-words max-w-[250px] sm:max-w-none text-sm sm:text-base">{profile.email}</p>
                </div>
              </div>
            </motion.div>

            {/* TasteMatch component */}
            {user && user.uid !== userId && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <TasteMatch userId={userId} />
              </motion.div>
            )}

            {/* UserStats component */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <UserStats userId={userId} />
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
                      <FilmIcon className="w-5 h-5" />
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
                      <TvIcon className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                <SearchBar />

                <motion.div 
                  layout
                  className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 -mx-8 px-8 sm:mx-0 sm:px-0"
                >
                  {['ALL', ...Object.keys(watchStatusLabels)].map((status) => (
                    <motion.button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={clsx(
                        "px-4 py-2.5 rounded-xl whitespace-nowrap transition-all",
                        "backdrop-blur-sm shadow-lg flex-shrink-0",
                        selectedStatus === status
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-black/40 hover:bg-black/50 text-gray-300 border border-white/10'
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {status === 'ALL' ? 'All' : watchStatusLabels[status]}
                    </motion.button>
                  ))}
                </motion.div>
              </div>

              {filteredWatchlist.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No items in watchlist</p>
                  {selectedStatus !== 'ALL' && (
                    <p className="text-sm text-gray-500">
                      Try changing the status filter or search query
                    </p>
                  )}
                </div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                >
                  {filteredWatchlist.map((movie, index) => (
                    <motion.div
                      key={movie.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="movie-card relative group"
                    >
                      <div
                        onClick={(e) => handleMovieClick(movie.mediaId, movie.mediaType, movie.id, e)}
                        className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer"
                      >
                        {movie.posterPath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                            alt={movie.title}
                            fill
                            className="object-cover"
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
                        <div className={`absolute inset-0 bg-black/60 flex flex-col justify-end p-4 transition-opacity duration-200 ${
                          touchedMovieId === movie.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <h4 className="text-white font-medium mb-2">
                            {movie.title}
                          </h4>
                          <div className="status-dropdown relative">
                            <p className="text-gray-300 text-sm mb-3">
                              {movie.status.replace(/_/g, ' ')}
                            </p>
                            {movie.rating && (
                              <div className="text-yellow-400 text-sm mb-3">
                                Rating: {movie.rating}/10
                              </div>
                            )}
                            <div onClick={(e) => e.stopPropagation()} className={`flex justify-center items-center mt-2 ${
                              !window.matchMedia('(hover: hover)').matches && touchedMovieId !== movie.id 
                                ? 'pointer-events-none' 
                                : ''
                            }`}>
                              <WatchlistButton
                                media={{
                                  id: movie.mediaId,
                                  title: movie.title,
                                  poster_path: movie.posterPath || '',
                                  media_type: movie.mediaType
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
        ) : null}
      </div>

      {/* Media Details Modal */}
      <AnimatePresence>
        {selectedMediaId && selectedMediaType && (
          <MediaDetailsModal
            mediaId={selectedMediaId}
            mediaType={selectedMediaType}
            onClose={() => {
              console.log('Closing modal, resetting states');
              setSelectedMediaId(null);
              setSelectedMediaType(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default withAuth(UserProfile); 