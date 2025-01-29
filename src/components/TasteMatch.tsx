'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { LuChevronDown, LuHeart, LuThumbsUp, LuPopcorn, LuTv, LuFilm } from 'react-icons/lu';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/api';

interface TasteMatchProps {
  userId: string;
}

interface MatchStats {
  overallMatch: number;
  commonMovies: {
    title: string;
    posterPath: string | null;
    rating: number;
  }[];
  commonShows: {
    title: string;
    posterPath: string | null;
    rating: number;
  }[];
  recommendations: {
    title: string;
    posterPath: string | null;
    mediaType: 'movie' | 'tv';
    reason: string;
  }[];
  genreMatch: {
    genre: string;
    percentage: number;
  }[];
  ratingCorrelation: number;
}

interface WatchlistEntry {
  id: string;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  status: string;
  rating: number | null;
  genres?: string[];
  createdAt: string;
}

export default function TasteMatch({ userId }: TasteMatchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { watchlist } = useWatchlist();

  const calculateOverallMatch = useCallback((commonMoviesCount: number, commonShowsCount: number, ratingCorrelation: number) => {
    // Weight factors for different components
    const commonMediaWeight = 0.4;  // 40% weight for common media
    const ratingWeight = 0.3;       // 30% weight for rating correlation
    const genreWeight = 0.3;        // 30% weight for genre match

    // Calculate common media score (max 100)
    const commonMediaScore = Math.min(((commonMoviesCount + commonShowsCount) * 15), 100);
    
    // Convert rating correlation (-1 to 1) to a 0-100 scale
    const ratingScore = ((ratingCorrelation + 1) / 2) * 100;

    // Calculate average genre match percentage
    const genreScore = matchStats?.genreMatch.reduce((sum, genre) => sum + genre.percentage, 0) || 0;
    const avgGenreScore = matchStats?.genreMatch.length 
      ? genreScore / matchStats.genreMatch.length 
      : 0;

    // Calculate weighted total
    const totalScore = (commonMediaScore * commonMediaWeight) +
                      (ratingScore * ratingWeight) +
                      (avgGenreScore * genreWeight);

    return Math.round(totalScore);
  }, [matchStats]);

  useEffect(() => {
    const calculateMatchStats = async () => {
      if (!user || !watchlist) return;

      try {
        setIsLoading(true);
        // Fetch friend's watchlist using authenticated request
        const data = await fetchWithAuth(`/api/users/${userId}/watchlist`);

        // Ensure friendWatchlist is an array
        const friendWatchlist: WatchlistEntry[] = Array.isArray(data) ? data : [];

        if (friendWatchlist.length === 0) {
          setMatchStats({
            overallMatch: 0,
            commonMovies: [],
            commonShows: [],
            recommendations: [],
            genreMatch: [],
            ratingCorrelation: 0
          });
          return;
        }

        // Find common movies and shows
        const commonMovies = watchlist
          .filter(entry => 
            entry.mediaType === 'movie' && 
            entry.status === 'WATCHED' &&
            friendWatchlist.some(
              (friendEntry) => 
                friendEntry.mediaId === entry.mediaId && 
                friendEntry.status === 'WATCHED'
            )
          )
          .map(entry => ({
            title: entry.title,
            posterPath: entry.posterPath,
            rating: entry.rating || 0,
            friendRating: friendWatchlist.find((fe) => fe.mediaId === entry.mediaId)?.rating || 0
          }));

        const commonShows = watchlist
          .filter(entry => 
            entry.mediaType === 'tv' && 
            entry.status === 'WATCHED' &&
            friendWatchlist.some(
              (friendEntry) => 
                friendEntry.mediaId === entry.mediaId && 
                friendEntry.status === 'WATCHED'
            )
          )
          .map(entry => ({
            title: entry.title,
            posterPath: entry.posterPath,
            rating: entry.rating || 0,
            friendRating: friendWatchlist.find((fe) => fe.mediaId === entry.mediaId)?.rating || 0
          }));

        // Calculate rating correlation
        const ratingPairs = [...commonMovies, ...commonShows]
          .map(item => ({
            userRating: item.rating,
            friendRating: item.friendRating
          }))
          .filter(pair => pair.userRating && pair.friendRating);

        let ratingCorrelation = 0;
        if (ratingPairs.length > 0) {
          const meanUser = ratingPairs.reduce((sum, pair) => sum + pair.userRating, 0) / ratingPairs.length;
          const meanFriend = ratingPairs.reduce((sum, pair) => sum + pair.friendRating, 0) / ratingPairs.length;
          
          const numerator = ratingPairs.reduce((sum, pair) => 
            sum + (pair.userRating - meanUser) * (pair.friendRating - meanFriend), 0
          );
          
          const denomUser = Math.sqrt(ratingPairs.reduce((sum, pair) => 
            sum + Math.pow(pair.userRating - meanUser, 2), 0
          ));
          
          const denomFriend = Math.sqrt(ratingPairs.reduce((sum, pair) => 
            sum + Math.pow(pair.friendRating - meanFriend, 2), 0
          ));
          
          ratingCorrelation = numerator / (denomUser * denomFriend);
        }

        // Generate recommendations based on common tastes
        const recommendations = await generateRecommendations(watchlist, friendWatchlist);

        setMatchStats({
          overallMatch: calculateOverallMatch(commonMovies.length, commonShows.length, ratingCorrelation),
          commonMovies: commonMovies.map(({ title, posterPath, rating }) => ({ title, posterPath, rating })),
          commonShows: commonShows.map(({ title, posterPath, rating }) => ({ title, posterPath, rating })),
          recommendations,
          genreMatch: calculateGenreMatch(watchlist, friendWatchlist),
          ratingCorrelation
        });

      } catch (error) {
        console.error('Error calculating match stats:', error);
        // Set default state on error
        setMatchStats({
          overallMatch: 0,
          commonMovies: [],
          commonShows: [],
          recommendations: [],
          genreMatch: [],
          ratingCorrelation: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    calculateMatchStats();
  }, [user, userId, watchlist, calculateOverallMatch]);

  const calculateGenreMatch = (userWatchlist: WatchlistEntry[], friendWatchlist: WatchlistEntry[]) => {
    // Get all genres from both watchlists, but only from WATCHED items
    const userGenres = new Map<string, { count: number; weight: number }>();
    const friendGenres = new Map<string, { count: number; weight: number }>();

    // Helper function to add genres with weight
    const addGenresToMap = (entry: WatchlistEntry, map: Map<string, { count: number; weight: number }>) => {
      if (!entry.genres) return;
      
      // Calculate weight based on status and rating
      let weight = 1;
      if (entry.status === 'WATCHED') {
        weight = 1.5;  // Give more weight to watched items
        if (entry.rating) {
          weight += (entry.rating / 10) * 0.5;  // Additional weight for highly rated items
        }
      }

      entry.genres.forEach(genre => {
        const current = map.get(genre) || { count: 0, weight: 0 };
        map.set(genre, {
          count: current.count + 1,
          weight: current.weight + weight
        });
      });
    };

    // Process watchlists
    userWatchlist.forEach(entry => addGenresToMap(entry, userGenres));
    friendWatchlist.forEach(entry => addGenresToMap(entry, friendGenres));

    // Calculate match percentage for each genre
    const genreMatches: { genre: string; percentage: number }[] = [];
    const allGenres = new Set([...userGenres.keys(), ...friendGenres.keys()]);

    allGenres.forEach(genre => {
      const userStats = userGenres.get(genre) || { count: 0, weight: 0 };
      const friendStats = friendGenres.get(genre) || { count: 0, weight: 0 };
      
      if (userStats.count > 0 && friendStats.count > 0) {
        // Calculate weighted similarity
        const maxWeight = Math.max(userStats.weight, friendStats.weight);
        const minWeight = Math.min(userStats.weight, friendStats.weight);
        const percentage = Math.round((minWeight / maxWeight) * 100);
        
        genreMatches.push({ genre, percentage });
      }
    });

    // Sort by percentage and return top 6
    return genreMatches
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);
  };

  const generateRecommendations = async (userWatchlist: WatchlistEntry[], friendWatchlist: WatchlistEntry[]) => {
    try {
      // Find items that friend has watched but user hasn't
      const potentialRecommendations = friendWatchlist.filter(
        friendEntry => 
          friendEntry.status === 'WATCHED' &&
          friendEntry.rating && friendEntry.rating >= 7 && // Only recommend highly rated content
          !userWatchlist.some(
            userEntry => 
              userEntry.mediaId === friendEntry.mediaId && 
              userEntry.mediaType === friendEntry.mediaType
          )
      );

      // Calculate user's genre preferences
      const userGenrePreferences = new Map<string, number>();
      userWatchlist
        .filter(entry => entry.status === 'WATCHED' && entry.rating && entry.rating >= 7)
        .forEach(entry => {
          entry.genres?.forEach(genre => {
            const currentCount = userGenrePreferences.get(genre) || 0;
            userGenrePreferences.set(genre, currentCount + 1);
          });
        });

      // Score recommendations based on genre match and friend's rating
      const scoredRecommendations = potentialRecommendations.map(item => {
        let genreMatchScore = 0;
        item.genres?.forEach(genre => {
          if (userGenrePreferences.has(genre)) {
            genreMatchScore += userGenrePreferences.get(genre)! * 2;
          }
        });

        return {
          ...item,
          score: (genreMatchScore * 0.6) + ((item.rating || 0) * 0.4)
        };
      });

      // Sort by score and get top 10
      const topRecommendations = scoredRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Fetch additional details and format response
      const recommendationsWithDetails = await Promise.all(
        topRecommendations.map(async (item) => {
          try {
            await fetchWithAuth(`/api/tmdb?path=/${item.mediaType}/${item.mediaId}`);
            
            // Create a personalized reason based on genres and rating
            const matchingGenres = item.genres?.filter(genre => userGenrePreferences.has(genre)) || [];
            let reason = `Rated ${item.rating}/10 by your friend`;
            if (matchingGenres.length > 0) {
              reason += ` • Matches your ${matchingGenres.slice(0, 2).join(' & ')} preferences`;
            }
            
            return {
              title: item.title,
              posterPath: item.posterPath,
              mediaType: item.mediaType,
              reason
            };
          } catch (error) {
            console.error('Error fetching media details:', error);
            return null;
          }
        })
      );

      return recommendationsWithDetails.filter((item): item is NonNullable<typeof item> => item !== null);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-white/5 rounded-2xl p-6 space-y-4">
        <div className="h-8 bg-white/10 rounded w-1/3" />
        <div className="h-4 bg-white/10 rounded w-1/4" />
      </div>
    );
  }

  if (!matchStats) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="bg-purple-500/20 p-3 rounded-xl">
            <LuHeart className="w-6 h-6 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-semibold">Taste Match</h3>
            <p className="text-gray-400 text-sm">
              {matchStats.overallMatch}% compatibility
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <LuChevronDown className="w-6 h-6 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-6 space-y-8">
              {/* Common Movies Section */}
              {matchStats.commonMovies.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LuFilm className="w-5 h-5" />
                    Common Movies
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {matchStats.commonMovies.slice(0, 4).map((movie, index) => (
                      <div key={movie.title} className="relative group">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden">
                          {movie.posterPath ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                              alt={movie.title}
                              fill
                              priority={index === 0}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                              <LuFilm className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
                          <p className="text-sm truncate">{movie.title}</p>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <LuThumbsUp className="w-4 h-4" />
                            <span className="text-xs">{movie.rating}/10</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Shows Section */}
              {matchStats.commonShows.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LuTv className="w-5 h-5" />
                    Common TV Shows
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {matchStats.commonShows.slice(0, 4).map((show, index) => (
                      <div key={show.title} className="relative group">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden">
                          {show.posterPath ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${show.posterPath}`}
                              alt={show.title}
                              fill
                              priority={index === 0 && matchStats.commonMovies.length === 0}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                              <LuTv className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
                          <p className="text-sm truncate">{show.title}</p>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <LuThumbsUp className="w-4 h-4" />
                            <span className="text-xs">{show.rating}/10</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations Section */}
              {matchStats.recommendations.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LuPopcorn className="w-5 h-5" />
                    Recommended for You
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {matchStats.recommendations.slice(0, 4).map((item) => (
                      <div key={item.title} className="relative group">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden">
                          {item.posterPath ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${item.posterPath}`}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                              {item.mediaType === 'movie' ? (
                                <LuFilm className="w-8 h-8 text-gray-400" />
                              ) : (
                                <LuTv className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
                          <p className="text-sm truncate">{item.title}</p>
                          <p className="text-xs text-gray-400 truncate">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre Match Section */}
              {matchStats.genreMatch.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Genre Compatibility</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {matchStats.genreMatch.map((genre) => (
                      <div key={genre.genre} className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">{genre.genre}</span>
                          <span className="text-sm text-purple-400">{genre.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${genre.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 
