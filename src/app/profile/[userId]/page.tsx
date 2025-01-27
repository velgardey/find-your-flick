"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';
import WatchlistButton from '@/components/WatchlistButton';
import MovieDetailsModal from '@/components/MovieDetailsModal';
import { LuSearch } from 'react-icons/lu';

interface UserProfile {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  email: string;
}

interface WatchlistMovie {
  id: string;
  movieId: number;
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

export default function UserProfile({ params }: PageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [touchedMovieId, setTouchedMovieId] = useState<string | null>(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);

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

  const handleMovieClick = (movieId: number, entryId: string, event: React.MouseEvent) => {
    if (!window.matchMedia('(hover: hover)').matches) {
      event.preventDefault();
      event.stopPropagation();
      if (touchedMovieId !== entryId) {
        handleCardTouch(entryId, event);
        return;
      }
    }
    setSelectedMovieId(movieId);
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
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const resolvedParams = await params;
        const [profileData, watchlistData] = await Promise.all([
          fetchWithAuth(`/api/users/${resolvedParams.userId}`),
          fetchWithAuth(`/api/users/${resolvedParams.userId}/watchlist`),
        ]);

        setProfile(profileData);
        setWatchlist(watchlistData);
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [params, user]);

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
    );

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-4xl mx-auto">
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
          <>
            <div className="flex items-center gap-6 mb-12">
              <Image
                src={profile.photoURL || '/default-avatar.png'}
                alt={profile.displayName || 'Unknown User'}
                width={96}
                height={96}
                className="rounded-full"
                priority={true}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.src !== '/default-avatar.png') {
                    img.src = '/default-avatar.png';
                  }
                }}
              />
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {profile.displayName || 'Unknown User'}
                </h2>
                <p className="text-gray-400">{profile.email}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-6">Watchlist</h3>
              <div className="flex flex-col gap-4">
                <div className="relative w-full search-container">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies..."
                    className="w-full px-4 py-2 bg-black/80 backdrop-blur-xl rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400 border border-white/10"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40">
                  <button
                    onClick={() => setSelectedStatus('ALL')}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
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
                      onClick={() => setSelectedStatus(status)}
                      className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                        selectedStatus === status
                          ? 'bg-white/20 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {watchlist.length === 0 ? (
                <p className="text-center text-gray-400 py-12">
                  No movies in watchlist yet
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {filteredWatchlist.map(movie => (
                      <motion.div
                        key={movie.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="movie-card relative group"
                      >
                        <div
                          onClick={(e) => handleMovieClick(movie.movieId, movie.id, e)}
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
                              <div onClick={(e) => e.stopPropagation()} className={`mt-2 ${
                                !window.matchMedia('(hover: hover)').matches && touchedMovieId !== movie.id 
                                  ? 'pointer-events-none' 
                                  : ''
                              }`}>
                                <WatchlistButton
                                  movie={{
                                    id: movie.movieId,
                                    title: movie.title,
                                    poster_path: movie.posterPath || '',
                                  }}
                                  position="bottom"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </>
        ) : null}
      </div>

      {selectedMovieId && (
        <MovieDetailsModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
} 