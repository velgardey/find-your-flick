"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';
import MediaDetailsModal from '@/components/MediaDetailsModal';
import WatchlistButton from '@/components/WatchlistButton';
import withAuth from '@/components/withAuth';

interface FeedItem {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string | null;
  movieId: number;
  movieTitle: string;
  moviePosterPath: string | null;
  movieBackdropPath: string | null;
  status: string;
  createdAt: string;
}

function Feed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv'>('movie');
  const { user } = useAuth();

  useEffect(() => {
    const fetchFeedItems = async () => {
      if (!user) return;
      
      try {
        const data = await fetchWithAuth<FeedItem[]>('/api/feed');
        setFeedItems(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching feed:', error);
        if (error instanceof Error && error.name !== 'AuthenticationError') {
          setError(error.message || 'Failed to load feed');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedItems();
  }, [user]);

  const handleMovieClick = (mediaId: number, mediaType: 'movie' | 'tv') => {
    setSelectedMediaId(mediaId);
    setSelectedMediaType(mediaType);
  };

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
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8">Your Feed</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-black/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 animate-pulse"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-1/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/3 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No activity in your feed yet</p>
            <p className="text-sm text-gray-500">
              Add some friends to see their movie activities here
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {feedItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="relative bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-lg border border-gray-800/50 rounded-xl p-4 sm:p-6 transition-all duration-300 hover:bg-white/10 group overflow-hidden shadow-lg hover:shadow-xl hover:scale-[1.02] hover:border-gray-700/50"
                >
                  {item.movieBackdropPath && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500">
                      <Image
                        src={`https://image.tmdb.org/t/p/w1280${item.movieBackdropPath}`}
                        alt=""
                        fill
                        className="object-cover transform scale-105 group-hover:scale-110 transition-all duration-500"
                        priority={false}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        style={{
                          opacity: 0,
                        }}
                      />
                    </div>
                  )}
                  <div className="relative flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                    <Link href={`/profile/${item.userId}`} className="transform hover:scale-105 transition-transform duration-300">
                      <div className="relative">
                        <Image
                          src={item.userPhotoURL || '/default-avatar.png'}
                          alt={item.userDisplayName}
                          width={48}
                          height={48}
                          className="rounded-full ring-2 ring-gray-800/50 hover:ring-blue-500/50 transition-all duration-300"
                        />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-2 space-y-1 sm:space-y-0 mb-2">
                        <Link href={`/profile/${item.userId}`} className="font-semibold text-white hover:text-blue-400 transition-colors duration-300">
                          {item.userDisplayName}
                        </Link>
                        <span className="text-gray-500 text-sm font-medium group relative">
                          <span className="hover:text-gray-300 transition-colors cursor-help">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </span>
                          <span className="absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-1 bg-black/90 backdrop-blur-sm rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                            {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </span>
                      </div>
                      <p className="text-gray-300 mt-1 font-medium">
                        <span className="text-blue-400">
                          {item.status === 'PLAN_TO_WATCH'
                            ? '📋 wants to watch'
                            : item.status === 'WATCHING'
                            ? '🎬 is watching'
                            : item.status === 'WATCHED'
                            ? '✅ has watched'
                            : item.status === 'ON_HOLD'
                            ? '⏸️ has put on hold'
                            : '❌ has dropped'}
                        </span>
                      </p>
                      <div 
                        className="mt-4 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 group/poster bg-black/30 rounded-lg p-3 hover:bg-black/50 transition-all duration-300"
                      >
                        <div 
                          className="relative overflow-hidden rounded-lg transition-transform duration-300 group-hover/poster:scale-105 shadow-md cursor-pointer shrink-0"
                          onClick={() => handleMovieClick(item.movieId, 'movie')}
                        >
                          {item.moviePosterPath ? (
                            <>
                              <div className="absolute inset-0 bg-white/5 animate-pulse" />
                              <Image
                                src={`https://image.tmdb.org/t/p/w154${item.moviePosterPath}`}
                                alt={item.movieTitle}
                                width={80}
                                height={120}
                                className="rounded-lg object-cover w-[80px] h-[120px]"
                                priority
                                quality={85}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement?.classList.add('bg-gray-800', 'rounded-lg');
                                  const fallbackText = document.createElement('span');
                                  fallbackText.className = 'text-gray-400 text-xs text-center absolute inset-0 flex items-center justify-center px-2';
                                  fallbackText.textContent = 'Image not available';
                                  target.parentElement?.appendChild(fallbackText);
                                }}
                              />
                            </>
                          ) : (
                            <div className="w-[80px] h-[120px] bg-gray-800 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs text-center px-2">No poster</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-center sm:text-left">
                          <h3 
                            className="text-white text-lg font-semibold group-hover/poster:text-blue-400 transition-colors cursor-pointer line-clamp-2"
                            onClick={() => handleMovieClick(item.movieId, 'movie')}
                          >
                            {item.movieTitle}
                          </h3>
                          <p className="text-gray-400 mt-1 text-sm mb-3">Click to view details</p>
                          <div onClick={(e) => e.stopPropagation()}>
                            <WatchlistButton
                              media={{
                                id: item.movieId,
                                title: item.movieTitle,
                                poster_path: item.moviePosterPath || '',
                                media_type: 'movie'
                              }}
                              position="bottom"
                            />
                          </div>
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

      <MediaDetailsModal
        mediaId={selectedMediaId}
        mediaType={selectedMediaType}
        onClose={() => setSelectedMediaId(null)}
      />
    </div>
  );
}

export default withAuth(Feed); 