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
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv'>('movie');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [touchedMovieId, setTouchedMovieId] = useState<string | null>(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortOptions = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    aToZ: 'A to Z',
    zToA: 'Z to A',
  };

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
    setSelectedMediaId(mediaId);
    setSelectedMediaType(mediaType);
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
    .filter(movie => selectedStatus === 'ALL' || movie.status === selectedStatus)
    .filter(movie => 
      !searchQuery || movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
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
              <div className="relative flex items-center gap-6">
                {profile.photoURL ? (
                  <Image
                    src={profile.photoURL}
                    alt={profile.displayName || 'User'}
                    width={96}
                    height={96}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-white/60">
                      {profile.displayName?.[0] || profile.email[0]}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold">
                    {profile.displayName || 'Anonymous User'}
                  </h1>
                  <p className="text-gray-400">{profile.email}</p>
                </div>
              </div>
            </motion.div>

            {/* Update TasteMatch component props */}
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

            {/* Update UserStats component props */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <UserStats userId={userId} />
            </motion.div>

            {/* Watchlist Section with Enhanced UI */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                >
                  Watchlist
                </motion.h2>
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 backdrop-blur-lg"
                  >
                    <span>🔍</span>
                    <span>Search</span>
                  </motion.button>
                  
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsSortOpen(!isSortOpen)}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 backdrop-blur-lg"
                    >
                      <span>↕️</span>
                      <span>Sort</span>
                    </motion.button>

                    <AnimatePresence>
                      {isSortOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-44 bg-black/90 backdrop-blur-xl rounded-lg shadow-lg border border-white/10 overflow-hidden z-50"
                        >
                          {Object.entries(sortOptions).map(([key, label]) => (
                            <motion.button
                              key={key}
                              onClick={() => {
                                setSortOption(key);
                                setIsSortOpen(false);
                              }}
                              className={`w-full h-11 px-3 text-left hover:bg-white/10 transition-colors flex items-center ${
                                sortOption === key ? 'text-white bg-white/10' : 'text-gray-300'
                              }`}
                              whileHover={{ x: 4 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span className="text-sm">{label}</span>
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6"
                  >
                    <input
                      type="text"
                      placeholder="Search your watchlist..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-lg"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                layout
                className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide"
              >
                {['ALL', ...Object.keys(watchStatusLabels)].map((status) => (
                  <motion.button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors backdrop-blur-lg ${
                      selectedStatus === status
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 hover:bg-white/15 text-gray-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {status === 'ALL' ? 'All' : watchStatusLabels[status]}
                  </motion.button>
                ))}
              </motion.div>

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
            </motion.div>
          </LayoutGroup>
        ) : null}
      </div>

      {/* Media Details Modal with Enhanced Animation */}
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

export default withAuth(UserProfile); 