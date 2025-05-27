
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
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
    const fetchData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch friend activity feed
        const feedData = await fetchWithAuth<FeedItem[]>('/api/feed');
        console.log('Feed data:', feedData);
        setFeedItems(Array.isArray(feedData) ? feedData : []);
      } catch (error) {
        console.error('Error fetching feed data:', error);
        setError('Failed to load feed data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleMovieClick = (mediaId: number, mediaType: 'movie' | 'tv') => {
    setSelectedMediaId(mediaId);
    setSelectedMediaType(mediaType);
  };

  // Format date to relative time (e.g., '2 days ago')
  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      // Catch without a parameter to avoid unused variable warnings
      return 'Invalid date';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h2>
          <p className="text-gray-400 mb-8">{error}</p>
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
    <div className="min-h-screen pt-20 pb-16 px-4 bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Friend Activity</h1>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No activity from friends yet</p>
            <p className="text-sm text-gray-500">
              Your friends&apos; activity will appear here when they add movies to their watchlists
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
                  className="bg-black/30 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4 transition-all duration-300 hover:bg-black/50 hover:border-gray-700/50"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {item.userPhotoURL ? (
                        <Image
                          src={item.userPhotoURL}
                          alt={item.userDisplayName}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {item.userDisplayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-white font-medium">{item.userDisplayName}</p>
                      <p className="text-gray-400 text-sm">
                        {item.status === 'watchlist' ? 'added to watchlist' : 'watched'}
                        {' • '}
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="group/poster">
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        <div className="w-full sm:w-auto flex justify-center sm:justify-start">
                          {item.moviePosterPath ? (
                            <>
                              <Image
                                src={`https://image.tmdb.org/t/p/w500${item.moviePosterPath}`}
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
                        <div className="flex-1 min-w-0 text-center sm:text-left p-4">
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
      
      {/* Media Details Modal */}
      <MediaDetailsModal
        mediaId={selectedMediaId}
        mediaType={selectedMediaType}
        onClose={() => setSelectedMediaId(null)}
      />
    </div>
  );
}

export default withAuth(Feed);