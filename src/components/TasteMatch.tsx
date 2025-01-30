'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/api';
import { clsx } from 'clsx';
import { LuUsers, LuChevronRight, LuFilm, LuTv, LuTrophy, LuHeart, LuThumbsUp, LuStar } from 'react-icons/lu';

interface TasteMatchProps {
  userId: string;
}

interface MatchStats {
  overallMatch: number;
  commonMovies: {
    title: string;
    posterPath: string | null;
    rating: number;
    friendRating: number;
  }[];
  commonShows: {
    title: string;
    posterPath: string | null;
    rating: number;
    friendRating: number;
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
  funStats: {
    favoriteGenre: string;
    highestRatedCommon: string;
    lowestRatedCommon: string;
    totalWatchTime: number;
    perfectMatches: number;
  };
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

  const calculateOverallMatch = useCallback((commonMoviesCount: number, commonShowsCount: number, ratingCorrelation: number, genreMatches: { genre: string; percentage: number }[]) => {
    if (commonMoviesCount + commonShowsCount > 0 || genreMatches.length > 0) {
      const commonMediaWeight = 0.4;
      const ratingWeight = 0.3;
      const genreWeight = 0.3;

      const commonMediaScore = Math.min(((commonMoviesCount + commonShowsCount) * 15), 100);
      const ratingScore = ((ratingCorrelation + 1) / 2) * 100;
      const genreScore = genreMatches.reduce((sum, genre) => sum + genre.percentage, 0);
      const avgGenreScore = genreMatches.length ? genreScore / genreMatches.length : 0;

      const totalScore = (commonMediaScore * commonMediaWeight) +
                        (ratingScore * ratingWeight) +
                        (avgGenreScore * genreWeight);

      return Math.max(1, Math.round(totalScore));
    }
    return 0;
  }, []);

  const calculateFunStats = (
    commonMovies: { title: string; rating: number; friendRating: number }[],
    commonShows: { title: string; rating: number; friendRating: number }[],
    genreMatch: { genre: string; percentage: number }[]
  ) => {
    const allCommon = [...commonMovies, ...commonShows];
    const perfectMatches = allCommon.filter(item => item.rating === item.friendRating).length;
    
    // Calculate favorite matching genre
    const favoriteGenre = genreMatch.length > 0 
      ? genreMatch.reduce((prev, current) => 
          current.percentage > prev.percentage ? current : prev
        ).genre 
      : 'None yet';

    // Find highest and lowest rated common content
    let highestRatedCommon = 'None yet';
    let lowestRatedCommon = 'None yet';
    
    if (allCommon.length > 0) {
      const sorted = [...allCommon].sort((a, b) => {
        const avgA = (a.rating + a.friendRating) / 2;
        const avgB = (b.rating + b.friendRating) / 2;
        return avgB - avgA;
      });
      
      highestRatedCommon = sorted[0].title;
      lowestRatedCommon = sorted[sorted.length - 1].title;
    }

    // Estimate total watch time (assuming average movie is 2 hours and episode is 45 minutes)
    const totalWatchTime = (commonMovies.length * 120) + (commonShows.length * 45);

    return {
      favoriteGenre,
      highestRatedCommon,
      lowestRatedCommon,
      totalWatchTime,
      perfectMatches
    };
  };

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

      if (potentialRecommendations.length === 0) {
        return [];
      }

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

      // Sort by score and get top 4 (since we only display 4 anyway)
      const topRecommendations = scoredRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      // Format recommendations without additional API calls
      return topRecommendations.map(item => {
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
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  };

  useEffect(() => {
    const calculateMatchStats = async () => {
      if (!user || !watchlist) {
        setIsLoading(false);
        setMatchStats(null);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetchWithAuth(`/api/users/${userId}/watchlist`);
        
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response from watchlist API');
        }

        const friendWatchlist: WatchlistEntry[] = Array.isArray(response) ? response : [];
        const userWatched = watchlist.filter(entry => entry.status === 'WATCHED');
        const friendWatched = friendWatchlist.filter(entry => entry.status === 'WATCHED');

        if (userWatched.length === 0 || friendWatched.length === 0) {
          setMatchStats({
            overallMatch: 0,
            commonMovies: [],
            commonShows: [],
            recommendations: [],
            genreMatch: [],
            ratingCorrelation: 0,
            funStats: {
              favoriteGenre: 'None yet',
              highestRatedCommon: 'None yet',
              lowestRatedCommon: 'None yet',
              totalWatchTime: 0,
              perfectMatches: 0
            }
          });
          setIsLoading(false);
          return;
        }

        // Find common content with ratings
        const commonMovies = userWatched
          .filter(entry => 
            entry.mediaType === 'movie' && 
            friendWatched.some(fe => fe.mediaId === entry.mediaId)
          )
          .map(entry => {
            const friendEntry = friendWatched.find(fe => fe.mediaId === entry.mediaId);
            return {
              title: entry.title,
              posterPath: entry.posterPath,
              rating: entry.rating || 0,
              friendRating: friendEntry?.rating || 0
            };
          });

        const commonShows = userWatched
          .filter(entry => 
            entry.mediaType === 'tv' && 
            friendWatched.some(fe => fe.mediaId === entry.mediaId)
          )
          .map(entry => {
            const friendEntry = friendWatched.find(fe => fe.mediaId === entry.mediaId);
            return {
              title: entry.title,
              posterPath: entry.posterPath,
              rating: entry.rating || 0,
              friendRating: friendEntry?.rating || 0
            };
          });

        // Calculate rating correlation
        const ratingPairs = [...commonMovies, ...commonShows]
          .filter(item => item.rating && item.friendRating);

        let ratingCorrelation = 0;
        if (ratingPairs.length > 0) {
          const meanUser = ratingPairs.reduce((sum, pair) => sum + pair.rating, 0) / ratingPairs.length;
          const meanFriend = ratingPairs.reduce((sum, pair) => sum + pair.friendRating, 0) / ratingPairs.length;
          
          const numerator = ratingPairs.reduce((sum, pair) => 
            sum + (pair.rating - meanUser) * (pair.friendRating - meanFriend), 0
          );
          
          const denomUser = Math.sqrt(ratingPairs.reduce((sum, pair) => 
            sum + Math.pow(pair.rating - meanUser, 2), 0
          ));
          
          const denomFriend = Math.sqrt(ratingPairs.reduce((sum, pair) => 
            sum + Math.pow(pair.friendRating - meanFriend, 2), 0
          ));
          
          if (denomUser !== 0 && denomFriend !== 0) {
            ratingCorrelation = numerator / (denomUser * denomFriend);
          }
        }

        // Calculate genre match and recommendations
        const genreMatch = calculateGenreMatch(userWatched, friendWatched);
        const recommendations = await generateRecommendations(userWatched, friendWatched);
        const overallMatch = calculateOverallMatch(
          commonMovies.length, 
          commonShows.length, 
          ratingCorrelation,
          genreMatch
        );

        // Calculate fun stats
        const funStats = calculateFunStats(commonMovies, commonShows, genreMatch);

        setMatchStats({
          overallMatch,
          commonMovies,
          commonShows,
          recommendations,
          genreMatch,
          ratingCorrelation,
          funStats
        });
      } catch (error) {
        console.error('Error calculating match stats:', error);
        setMatchStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    calculateMatchStats();
  }, [user, userId, watchlist, calculateOverallMatch]);

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 flex items-center gap-4 animate-pulse">
          <div className="bg-purple-500/20 p-3 rounded-xl">
            <div className="w-6 h-6 bg-purple-400/20 rounded" />
          </div>
          <div className="flex-1">
            <div className="h-6 bg-white/10 rounded w-32 mb-2" />
            <div className="h-4 bg-white/10 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!matchStats) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 text-center">
          <p className="text-gray-400">No taste match data available</p>
        </div>
      </div>
    );
  }

  const hasContent = matchStats && (
    matchStats.commonMovies.length > 0 || 
    matchStats.commonShows.length > 0 || 
    (matchStats.genreMatch.length > 0 && matchStats.overallMatch > 0)
  );

  if (!hasContent) {
    const hasWatchedContent = watchlist?.some(item => item.status === 'WATCHED');
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 text-center">
          <p className="text-gray-400">
            {hasWatchedContent 
              ? "No matches found yet. Keep watching and rating content to see your taste match!"
              : "Start watching content to see your taste match!"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center gap-4 text-left"
      >
        <div className="bg-purple-500/20 p-3 rounded-xl">
          <LuUsers className="w-6 h-6 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">Taste Match</h3>
            {matchStats.overallMatch > 0 && (
              <div className="px-2 py-1 text-sm bg-purple-500/20 text-purple-400 rounded-lg">
                {matchStats.overallMatch}%
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate">
            {getMatchDescription(matchStats)}
          </p>
        </div>
        <LuChevronRight 
          className={clsx(
            "w-5 h-5 text-gray-400 transition-transform",
            isExpanded && "rotate-90"
          )} 
        />
      </button>

      <AnimatePresence>
        {isExpanded && matchStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 space-y-6">
              {/* Fun Stats Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <LuHeart className="w-5 h-5 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Perfect Matches</p>
                  <p className="text-lg font-medium">{matchStats.funStats.perfectMatches}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <LuTrophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Favorite Genre</p>
                  <p className="text-lg font-medium truncate">{matchStats.funStats.favoriteGenre}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <LuThumbsUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Rating Match</p>
                  <p className="text-lg font-medium">{Math.round(matchStats.ratingCorrelation * 100)}%</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <LuStar className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Watch Time</p>
                  <p className="text-lg font-medium">{Math.round(matchStats.funStats.totalWatchTime / 60)}h</p>
                </div>
              </div>

              {/* Common Content Section */}
              {(matchStats.commonMovies.length > 0 || matchStats.commonShows.length > 0) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Common Content</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Common Movies */}
                    {matchStats.commonMovies.length > 0 && (
                      <div>
                        <h5 className="text-xs text-gray-500 mb-2">Movies ({matchStats.commonMovies.length})</h5>
                        <div className="space-y-2">
                          {matchStats.commonMovies.map((movie, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {movie.posterPath ? (
                                <Image
                                  src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                                  alt={movie.title}
                                  width={32}
                                  height={48}
                                  className="rounded"
                                />
                              ) : (
                                <div className="w-8 h-12 bg-white/5 rounded flex items-center justify-center">
                                  <LuFilm className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{movie.title}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>You: {movie.rating}/10</span>
                                  <span>•</span>
                                  <span>Friend: {movie.friendRating}/10</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Common Shows */}
                    {matchStats.commonShows.length > 0 && (
                      <div>
                        <h5 className="text-xs text-gray-500 mb-2">TV Shows ({matchStats.commonShows.length})</h5>
                        <div className="space-y-2">
                          {matchStats.commonShows.map((show, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {show.posterPath ? (
                                <Image
                                  src={`https://image.tmdb.org/t/p/w92${show.posterPath}`}
                                  alt={show.title}
                                  width={32}
                                  height={48}
                                  className="rounded"
                                />
                              ) : (
                                <div className="w-8 h-12 bg-white/5 rounded flex items-center justify-center">
                                  <LuTv className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{show.title}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>You: {show.rating}/10</span>
                                  <span>•</span>
                                  <span>Friend: {show.friendRating}/10</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Genre Match Section */}
              {matchStats.genreMatch.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Genre Match</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {matchStats.genreMatch.map((genre, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                      >
                        <span className="text-sm truncate">{genre.genre}</span>
                        <span className="text-sm text-purple-400">{genre.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations Section */}
              {matchStats.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Recommendations</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {matchStats.recommendations.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="aspect-[2/3] relative rounded overflow-hidden bg-white/5">
                          {item.posterPath ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w342${item.posterPath}`}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {item.mediaType === 'movie' ? (
                                <LuFilm className="w-8 h-8 text-gray-400" />
                              ) : (
                                <LuTv className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <h5 className="text-sm font-medium truncate">{item.title}</h5>
                          <p className="text-xs text-gray-400">{item.reason}</p>
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

const getMatchDescription = (matchStats: MatchStats): string => {
  if (matchStats.commonMovies.length === 0 && matchStats.commonShows.length === 0) {
    return 'No common content yet';
  }

  const commonCount = matchStats.commonMovies.length + matchStats.commonShows.length;
  const commonType = matchStats.commonMovies.length > matchStats.commonShows.length ? 'movies' : 'shows';
  
  if (matchStats.ratingCorrelation > 0.7) {
    return `Strong match! You share ${commonCount} ${commonType}`;
  } else if (matchStats.ratingCorrelation > 0.3) {
    return `Good match with ${commonCount} shared ${commonType}`;
  } else {
    return `You share ${commonCount} ${commonType}`;
  }
}; 
