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
import { MagnifyingGlassIcon, FilmIcon, TvIcon, FunnelIcon, CalendarIcon, CheckIcon, StarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
type MenuRenderPropArg = { open: boolean };
import clsx from 'clsx';
import { Fragment } from 'react';

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
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showMovies, setShowMovies] = useState(true);
  const [showShows, setShowShows] = useState(true);
  const [sortBy, setSortBy] = useState('date');

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
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const renderMenu = ({ open }: MenuRenderPropArg) => (
    <>
      <Menu.Button
        as={motion.button}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={clsx(
          "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          open ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:bg-white/10"
        )}
      >
        <FunnelIcon className="w-4 h-4" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-gray-900/90 backdrop-blur-sm border border-white/10 shadow-lg focus:outline-none z-10">
          <div className="p-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setSortBy('date')}
                  className={clsx(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md",
                    active ? "bg-white/10" : ""
                  )}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Date Added
                  {sortBy === 'date' && (
                    <CheckIcon className="w-4 h-4 ml-auto" />
                  )}
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setSortBy('rating')}
                  className={clsx(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md",
                    active ? "bg-white/10" : ""
                  )}
                >
                  <StarIcon className="w-4 h-4" />
                  Rating
                  {sortBy === 'rating' && (
                    <CheckIcon className="w-4 h-4 ml-auto" />
                  )}
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setSortBy('title')}
                  className={clsx(
                    "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md",
                    active ? "bg-white/10" : ""
                  )}
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  Title
                  {sortBy === 'title' && (
                    <CheckIcon className="w-4 h-4 ml-auto" />
                  )}
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </>
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
              <div className="flex items-center justify-between mb-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                >
                  Watchlist
                </motion.h2>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Search watchlist..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/20"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowMovies(!showMovies)}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        showMovies ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:bg-white/10"
                      )}
                    >
                      <FilmIcon className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowShows(!showShows)}
                      className={clsx(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        showShows ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:bg-white/10"
                      )}
                    >
                      <TvIcon className="w-4 h-4" />
                    </motion.button>
                    <Menu as="div" className="relative">
                      {renderMenu}
                    </Menu>
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