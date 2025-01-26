"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';

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
              {watchlist.length === 0 ? (
                <p className="text-center text-gray-400 py-12">
                  No movies in watchlist yet
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {watchlist.map((movie) => (
                      <motion.div
                        key={movie.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group"
                      >
                        <div className="aspect-[2/3] relative rounded-xl overflow-hidden">
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                            alt={movie.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <h4 className="text-white font-medium mb-1">
                              {movie.title}
                            </h4>
                            <p className="text-gray-300 text-sm">
                              {movie.status.replace(/_/g, ' ')}
                            </p>
                            {movie.rating && (
                              <div className="text-yellow-400 text-sm mt-1">
                                Rating: {movie.rating}/10
                              </div>
                            )}
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
    </div>
  );
} 