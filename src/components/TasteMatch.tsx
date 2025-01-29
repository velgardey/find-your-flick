'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/api';
import { clsx } from 'clsx';
import { ChevronRightIcon, FilmIcon, TvIcon, UsersIcon } from '@heroicons/react/24/outline';

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

  const calculateOverallMatch = useCallback((commonMoviesCount: number, commonShowsCount: number, ratingCorrelation: number, genreMatches: { genre: string; percentage: number }[]) => {
    // If there's any common media or genre matches, ensure we return at least 1
    if (commonMoviesCount + commonShowsCount > 0 || genreMatches.length > 0) {
      // Weight factors for different components
      const commonMediaWeight = 0.4;  // 40% weight for common media
      const ratingWeight = 0.3;       // 30% weight for rating correlation
      const genreWeight = 0.3;        // 30% weight for genre match

      // Calculate common media score (max 100)
      const commonMediaScore = Math.min(((commonMoviesCount + commonShowsCount) * 15), 100);
      
      // Convert rating correlation (-1 to 1) to a 0-100 scale
      const ratingScore = ((ratingCorrelation + 1) / 2) * 100;

      // Calculate average genre match percentage
      const genreScore = genreMatches.reduce((sum, genre) => sum + genre.percentage, 0);
      const avgGenreScore = genreMatches.length ? genreScore / genreMatches.length : 0;

      // Calculate weighted total
      const totalScore = (commonMediaScore * commonMediaWeight) +
                        (ratingScore * ratingWeight) +
                        (avgGenreScore * genreWeight);

      // Ensure we return at least 1 if there's any match
      return Math.max(1, Math.round(totalScore));
    }

    return 0; // Return 0 only if there's absolutely no match
  }, []);

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
        // Fetch friend's watchlist using authenticated request
        const response = await fetchWithAuth(`/api/users/${userId}/watchlist`);
        
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response from watchlist API');
        }

        // Ensure friendWatchlist is an array
        const friendWatchlist: WatchlistEntry[] = Array.isArray(response) ? response : [];

        // Debug logging
        console.log('User watchlist:', watchlist.length, 'items');
        console.log('Friend watchlist:', friendWatchlist.length, 'items');

        // Get watched items from both watchlists
        const userWatched = watchlist.filter(entry => entry.status === 'WATCHED');
        const friendWatched = friendWatchlist.filter(entry => entry.status === 'WATCHED');

        console.log('User watched items:', userWatched.length);
        console.log('Friend watched items:', friendWatched.length);

        // If either user has no watched content, set empty stats
        if (userWatched.length === 0 || friendWatched.length === 0) {
          console.log('No watched content found');
          setMatchStats({
            overallMatch: 0,
            commonMovies: [],
            commonShows: [],
            recommendations: [],
            genreMatch: [],
            ratingCorrelation: 0
          });
          setIsLoading(false);
          return;
        }

        // Find common movies and shows
        const commonMovies = userWatched
          .filter(entry => 
            entry.mediaType === 'movie' && 
            friendWatched.some(
              (friendEntry) => 
                friendEntry.mediaId === entry.mediaId
            )
          )
          .map(entry => ({
            title: entry.title,
            posterPath: entry.posterPath,
            rating: entry.rating || 0,
            friendRating: friendWatched.find((fe) => fe.mediaId === entry.mediaId)?.rating || 0
          }));

        const commonShows = userWatched
          .filter(entry => 
            entry.mediaType === 'tv' && 
            friendWatched.some(
              (friendEntry) => 
                friendEntry.mediaId === entry.mediaId
            )
          )
          .map(entry => ({
            title: entry.title,
            posterPath: entry.posterPath,
            rating: entry.rating || 0,
            friendRating: friendWatched.find((fe) => fe.mediaId === entry.mediaId)?.rating || 0
          }));

        console.log('Common movies:', commonMovies.length);
        console.log('Common shows:', commonShows.length);

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
          
          if (denomUser === 0 || denomFriend === 0) {
            ratingCorrelation = 0;
          } else {
            ratingCorrelation = numerator / (denomUser * denomFriend);
          }
        }

        // Calculate genre match using watched items only
        const genreMatch = calculateGenreMatch(userWatched, friendWatched);
        console.log('Genre matches:', genreMatch.length);

        // Generate recommendations based on watched items
        const recommendations = await generateRecommendations(userWatched, friendWatched);
        console.log('Recommendations:', recommendations.length);

        // Calculate overall match score
        const overallMatch = calculateOverallMatch(
          commonMovies.length, 
          commonShows.length, 
          ratingCorrelation,
          genreMatch
        );
        console.log('Overall match score:', overallMatch);

        const newMatchStats = {
          overallMatch,
          commonMovies: commonMovies.map(({ title, posterPath, rating }) => ({ title, posterPath, rating })),
          commonShows: commonShows.map(({ title, posterPath, rating }) => ({ title, posterPath, rating })),
          recommendations,
          genreMatch,
          ratingCorrelation
        };

        setMatchStats(newMatchStats);
      } catch (error) {
        console.error('Error calculating match stats:', error);
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
  }, [userId, user, watchlist, calculateOverallMatch]);

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

  // Check if there's any meaningful content to display
  const hasContent = matchStats && (
    matchStats.commonMovies.length > 0 || 
    matchStats.commonShows.length > 0 || 
    (matchStats.genreMatch.length > 0 && matchStats.overallMatch > 0)
  );

  // If we have matchStats but no content matches
  if (matchStats && !hasContent) {
    // Check if both users have watched content
    const hasWatchedContent = watchlist?.some(item => item.status === 'WATCHED');
    
    if (hasWatchedContent) {
      return (
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 text-center">
            <p className="text-gray-400">No matches found yet. Keep watching and rating content to see your taste match!</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-6 text-center">
            <p className="text-gray-400">Start watching content to see your taste match!</p>
          </div>
        </div>
      );
    }
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
          <UsersIcon className="w-6 h-6 text-purple-400" />
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
        <ChevronRightIcon 
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
              {/* Common Content Section */}
              {(matchStats.commonMovies.length > 0 || matchStats.commonShows.length > 0) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Common Content</h4>
                  <div className="grid grid-cols-2 gap-4">
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
                                  <FilmIcon className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{movie.title}</p>
                                <p className="text-xs text-gray-400">Rating: {movie.rating}/10</p>
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
                                  <TvIcon className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{show.title}</p>
                                <p className="text-xs text-gray-400">Rating: {show.rating}/10</p>
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
                  <h4 className="text-sm font-medium text-gray-400 mb-3">
                    Genre Match
                    {matchStats.ratingCorrelation > 0 && (
                      <span className="ml-2 text-xs text-purple-400">
                        ({Math.round(matchStats.ratingCorrelation * 100)}% rating correlation)
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {matchStats.genreMatch.map((genre, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-lg p-2 flex items-center justify-between"
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
                                <FilmIcon className="w-8 h-8 text-gray-400" />
                              ) : (
                                <TvIcon className="w-8 h-8 text-gray-400" />
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
