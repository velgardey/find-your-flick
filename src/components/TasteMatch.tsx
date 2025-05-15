'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';
import Image from 'next/image';
import { fetchWithAuth } from '@/lib/api';
import { clsx } from 'clsx';
import { LuUsers, LuChevronRight, LuFilm, LuTv, LuTrophy, LuHeart, LuLightbulb, LuStar, LuFilter, LuPlay } from 'react-icons/lu';
import MediaDetailsModal from '@/components/MediaDetailsModal';

interface TasteMatchProps {
  userId: string;
}

interface CommonMedia {
  id: string;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  rating: number | null;
  friendRating: number | null | undefined;
}

interface MatchStats {
  overallMatch: number;
  commonMovies: CommonMedia[];
  commonShows: CommonMedia[];
  recommendations: {
    title: string;
    posterPath: string | null;
    mediaType: 'movie' | 'tv';
    mediaId: number;
    reason: string;
  }[];
  genreMatch: {
    genre: string;
    percentage: number;
  }[];
  insightStats: {
    favoriteGenre: string;
    highestRatedCommon: string;
    lowestRatedCommon: string;
    totalMediaCount: number;
    uniqueGenres: number;
    quirkyStat: string;
  };
  compatibilityScore: number;
  taskCompletionRate: number;
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

// Add user profile interface
interface UserProfile {
  id: string;
  displayName: string | null;
  photoURL: string | null;
  email: string;
}

export default function TasteMatch({ userId }: TasteMatchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{mediaId: number; mediaType: 'movie' | 'tv'} | null>(null);
  const [friendName, setFriendName] = useState<string>("");
  const { user } = useAuth();
  const { watchlist } = useWatchlist();

  /**
   * Calculates the overall match score between two users
   * Uses a weighted algorithm based on common media and genre preferences
   */
  const calculateOverallMatch = useCallback((commonMoviesCount: number, commonShowsCount: number, genreMatches: { genre: string; percentage: number }[]) => {
    if (commonMoviesCount + commonShowsCount === 0 && genreMatches.length === 0) {
      return 0;
    }

    // Base weights
    let commonMediaWeight = 0.5;
    let genreWeight = 0.5;

    // If we don't have genre matches, adjust weights
    if (genreMatches.length === 0) {
      commonMediaWeight = 1.0;
      genreWeight = 0;
    }

    // Calculate common media score with a more gradual curve
    const totalMediaCount = commonMoviesCount + commonShowsCount;
    const commonMediaScore = Math.min(Math.pow(totalMediaCount * 5, 0.85), 100);
    
    // Calculate genre compatibility
    const genreScore = genreMatches.reduce((sum, genre) => sum + genre.percentage, 0);
    const avgGenreScore = genreMatches.length ? genreScore / genreMatches.length : 0;

    // Calculate total score with adjusted weights
    const totalScore = (commonMediaScore * commonMediaWeight) + (avgGenreScore * genreWeight);

    return Math.max(1, Math.min(100, Math.round(totalScore)));
  }, []);

  /**
   * Calculates advanced insight stats between users
   * Focuses on interesting and fun statistics beyond just ratings
   */
  const calculateInsightStats = (
    userWatchlist: WatchlistEntry[],
    friendWatchlist: WatchlistEntry[],
    commonMovies: CommonMedia[],
    commonShows: CommonMedia[],
    genreMatch: { genre: string; percentage: number }[]
  ) => {
    const allCommon = [...commonMovies, ...commonShows];
    
    // Get favorite matching genre
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
        const avgA = ((a.rating || 0) + (a.friendRating || 0)) / 2;
        const avgB = ((b.rating || 0) + (b.friendRating || 0)) / 2;
        return avgB - avgA;
      });
      
      highestRatedCommon = sorted[0].title;
      lowestRatedCommon = sorted[sorted.length - 1].title;
    }

    // Calculate unique genres count
    const allUserGenres = new Set<string>();
    const allFriendGenres = new Set<string>();
    
    userWatchlist.forEach(entry => entry.genres?.forEach(g => allUserGenres.add(g)));
    friendWatchlist.forEach(entry => entry.genres?.forEach(g => allFriendGenres.add(g)));
    
    const uniqueGenres = new Set([...allUserGenres, ...allFriendGenres]).size;

    // Calculate total media count between both users
    const totalMediaCount = userWatchlist.length + friendWatchlist.length;

    // Generate a quirky stat
    const quirkyStats = [
      `You'd need ${Math.round((totalMediaCount * 2) / 24)} days to watch everything together`,
      `You share ${Math.round(allCommon.length / Math.max(userWatchlist.length, friendWatchlist.length) * 100)}% of your taste`,
      `Together you've explored ${uniqueGenres} different genres`,
      `You'd make a great ${favoriteGenre} movie marathon team`,
      `You have a ${Math.round(commonMovies.length / (commonMovies.length + commonShows.length) * 100)}% preference for movies over shows`
    ];
    
    const quirkyStat = quirkyStats[Math.floor(Math.random() * quirkyStats.length)];

    return {
      favoriteGenre,
      highestRatedCommon,
      lowestRatedCommon,
      uniqueGenres,
      totalMediaCount,
      quirkyStat
    };
  };

  /**
   * Calculate a compatibility score by analyzing common patterns
   * This score is separate from the overall match and focuses on media consumption compatibility
   */
  const calculateCompatibilityScore = (userWatchlist: WatchlistEntry[], friendWatchlist: WatchlistEntry[]): number => {
    // Early return if insufficient data
    if (userWatchlist.length === 0 || friendWatchlist.length === 0) {
      return 0;
    }

    // Check for similar media consumption patterns
    const userStatuses = {
      WATCHED: userWatchlist.filter(e => e.status === 'WATCHED').length,
      WATCHING: userWatchlist.filter(e => e.status === 'WATCHING').length,
      PLAN_TO_WATCH: userWatchlist.filter(e => e.status === 'PLAN_TO_WATCH').length
    };
    
    const friendStatuses = {
      WATCHED: friendWatchlist.filter(e => e.status === 'WATCHED').length,
      WATCHING: friendWatchlist.filter(e => e.status === 'WATCHING').length,
      PLAN_TO_WATCH: friendWatchlist.filter(e => e.status === 'PLAN_TO_WATCH').length
    };

    // Calculate similarity in consumption patterns (0-40 points)
    const userTotal = Object.values(userStatuses).reduce((a, b) => a + b, 0);
    const friendTotal = Object.values(friendStatuses).reduce((a, b) => a + b, 0);
    
    let patternScore = 0;
    if (userTotal > 0 && friendTotal > 0) {
      const userRatios = {
        WATCHED: userStatuses.WATCHED / userTotal,
        WATCHING: userStatuses.WATCHING / userTotal,
        PLAN_TO_WATCH: userStatuses.PLAN_TO_WATCH / userTotal
      };
      
      const friendRatios = {
        WATCHED: friendStatuses.WATCHED / friendTotal,
        WATCHING: friendStatuses.WATCHING / friendTotal,
        PLAN_TO_WATCH: friendStatuses.PLAN_TO_WATCH / friendTotal
      };
      
      const ratioSimilarity = 1 - (
        Math.abs(userRatios.WATCHED - friendRatios.WATCHED) +
        Math.abs(userRatios.WATCHING - friendRatios.WATCHING) +
        Math.abs(userRatios.PLAN_TO_WATCH - friendRatios.PLAN_TO_WATCH)
      ) / 2;
      
      patternScore = ratioSimilarity * 40;
    }

    // Calculate genre diversity similarity (0-30 points)
    const userGenres = new Set<string>();
    const friendGenres = new Set<string>();
    
    userWatchlist.forEach(entry => entry.genres?.forEach(g => userGenres.add(g)));
    friendWatchlist.forEach(entry => entry.genres?.forEach(g => friendGenres.add(g)));
    
    const userGenreCount = userGenres.size;
    const friendGenreCount = friendGenres.size;
    
    let genreDiversityScore = 0;
    if (userGenreCount > 0 && friendGenreCount > 0) {
      const diversityRatio = 1 - Math.abs(userGenreCount - friendGenreCount) / Math.max(userGenreCount, friendGenreCount);
      genreDiversityScore = diversityRatio * 30;
    }

    // Calculate media type preference similarity (0-30 points)
    const userMovieRatio = userWatchlist.filter(e => e.mediaType === 'movie').length / userWatchlist.length;
    const friendMovieRatio = friendWatchlist.filter(e => e.mediaType === 'movie').length / friendWatchlist.length;
    
    const mediaTypeScore = (1 - Math.abs(userMovieRatio - friendMovieRatio)) * 30;

    // Combine scores
    const totalScore = patternScore + genreDiversityScore + mediaTypeScore;
    return Math.round(totalScore);
  };

  /**
   * Calculate a task completion rate that shows how effectively users complete watching media
   */
  const calculateTaskCompletionRate = (userWatchlist: WatchlistEntry[], friendWatchlist: WatchlistEntry[]): number => {
    // Early return if insufficient data
    if (userWatchlist.length === 0 || friendWatchlist.length === 0) {
      return 0;
    }

    const userWatchedCount = userWatchlist.filter(e => e.status === 'WATCHED').length;
    const userPlannedCount = userWatchlist.filter(e => e.status === 'PLAN_TO_WATCH').length;
    
    const friendWatchedCount = friendWatchlist.filter(e => e.status === 'WATCHED').length;
    const friendPlannedCount = friendWatchlist.filter(e => e.status === 'PLAN_TO_WATCH').length;
    
    // Calculate individual completion rates
    const userCompletionRate = userPlannedCount > 0 ? userWatchedCount / (userWatchedCount + userPlannedCount) : 1;
    const friendCompletionRate = friendPlannedCount > 0 ? friendWatchedCount / (friendWatchedCount + friendPlannedCount) : 1;
    
    // Return average of both completion rates as a percentage
    return Math.round(((userCompletionRate + friendCompletionRate) / 2) * 100);
  };

  /**
   * Calculate genre matches between users with weighted analysis
   * Advanced genre matching that considers user preferences and genre weights
   */
  const calculateGenreMatch = (userWatchlist: WatchlistEntry[], friendWatchlist: WatchlistEntry[]) => {
    const userGenres = new Map<string, { count: number; weight: number }>();
    const friendGenres = new Map<string, { count: number; weight: number }>();

    const addGenresToMap = (entry: WatchlistEntry, map: Map<string, { count: number; weight: number }>) => {
      if (!entry.genres) return;
      
      // Enhanced weight calculation based on status and ratings
      let weight = 0.5; // Base weight for all items
      
      if (entry.status === 'WATCHED') {
        weight = 1.0; // Base weight for watched items
        if (entry.rating) {
          weight += (entry.rating / 10) * 0.5; // Additional weight for ratings
        }
      } else if (entry.status === 'WATCHING') {
        weight = 0.75; // Items being watched get more weight than planned
      } else if (entry.status === 'PLAN_TO_WATCH') {
        weight = 0.25; // Small weight for planned items
      }

      // Give more recent items slightly more weight
      const entryDate = new Date(entry.createdAt);
      const now = new Date();
      const monthsOld = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const recencyBonus = Math.max(0, 0.2 - (monthsOld / 12) * 0.1); // Bonus maxes at 0.2, decreases over a year
      weight += recencyBonus;

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
        // Enhanced similarity calculation using multiple metrics
        
        // 1. Weight ratio similarity
        const maxWeight = Math.max(userStats.weight, friendStats.weight);
        const minWeight = Math.min(userStats.weight, friendStats.weight);
        const weightSimilarity = (minWeight / maxWeight) * 100;
        
        // 2. Normalized weight per item similarity
        const userNormWeight = userStats.weight / userStats.count;
        const friendNormWeight = friendStats.weight / friendStats.count;
        const normWeightRatio = Math.min(userNormWeight, friendNormWeight) / Math.max(userNormWeight, friendNormWeight);
        const normWeightSimilarity = normWeightRatio * 100;
        
        // 3. Count ratio similarity
        const countRatio = Math.min(userStats.count, friendStats.count) / Math.max(userStats.count, friendStats.count);
        const countSimilarity = countRatio * 100;
        
        // Combined similarity score with weighted components
        const percentage = Math.round(
          weightSimilarity * 0.5 + // Weight has highest importance
          normWeightSimilarity * 0.3 + // Normalized weight has medium importance
          countSimilarity * 0.2 // Count has lowest importance
        );
        
        genreMatches.push({ genre, percentage });
      }
    });

    // Sort by percentage and return top matches
    return genreMatches
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);
  };

  /**
   * Generate personalized recommendations based on friend's highly rated content
   * Enhanced algorithm that considers multiple factors for better suggestions
   */
  const generateRecommendations = async (userWatchlist: WatchlistEntry[], friendWatchlist: WatchlistEntry[]) => {
    try {
      // Get user's watched content
      const userWatched = userWatchlist.filter(
        entry => entry.status === 'WATCHED' || entry.status === 'WATCHING'
      );

      // Get user's already planned content
      const userPlanned = userWatchlist.filter(
        entry => entry.status === 'PLAN_TO_WATCH'
      );

      // Find already consumed media IDs
      const consumedMediaIds = new Set(userWatchlist.map(entry => entry.mediaId));

      // Get friend's highly rated content
      const potentialRecommendations = friendWatchlist.filter(
        friendEntry => 
          friendEntry.status === 'WATCHED' &&
          friendEntry.rating && 
          friendEntry.rating >= 7 && // Only recommend highly rated content
          !consumedMediaIds.has(friendEntry.mediaId) // Exclude content the user has already seen or planned
      );

      if (potentialRecommendations.length === 0) {
        return [];
      }

      // Calculate user's genre preferences with weighted ratings
      const userGenrePreferences = new Map<string, { count: number; avgRating: number }>();
      userWatched.forEach(entry => {
        entry.genres?.forEach(genre => {
          const current = userGenrePreferences.get(genre) || { count: 0, avgRating: 0 };
          userGenrePreferences.set(genre, {
            count: current.count + 1,
            avgRating: ((current.avgRating * current.count) + (entry.rating || 0)) / (current.count + 1)
          });
        });
      });

      // Score recommendations based on multiple factors
      const scoredRecommendations = potentialRecommendations.map(item => {
        let score = 0;
        
        // Friend's rating score (0-50 points)
        score += ((item.rating || 0) / 10) * 50;
        
        // Genre match score (0-30 points)
        let genreMatchScore = 0;
        let matchedGenres = 0;
        item.genres?.forEach(genre => {
          const userPref = userGenrePreferences.get(genre);
          if (userPref) {
            // Calculate a weighted genre score that considers both count and rating
            const countWeight = Math.min(1, userPref.count / 3); // Cap at 3 items
            const ratingWeight = userPref.avgRating / 10;
            genreMatchScore += (countWeight * 0.5 + ratingWeight * 0.5) * 10;
            matchedGenres++;
          }
        });
        
        if (matchedGenres > 0) {
          score += (genreMatchScore / matchedGenres) * 30;
        }
        
        // Recency bonus (0-10 points)
        const releaseDate = new Date(item.createdAt);
        const now = new Date();
        const monthsOld = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        const recencyScore = Math.max(0, 10 - (monthsOld / 3)); // Lose points for every 3 months old
        score += recencyScore;
        
        // Media type bonus (0-10 points)
        // Check if user has a preference for movies or TV shows
        const userMovieCount = userWatched.filter(e => e.mediaType === 'movie').length;
        const userTvCount = userWatched.filter(e => e.mediaType === 'tv').length;
        
        if (userMovieCount > userTvCount && item.mediaType === 'movie') {
          score += 10 * (userMovieCount / (userMovieCount + userTvCount));
        } else if (userTvCount > userMovieCount && item.mediaType === 'tv') {
          score += 10 * (userTvCount / (userMovieCount + userTvCount));
        }

        return {
          ...item,
          score,
          matchedGenres
        };
      });

      // Sort by score and get top 4
      const topRecommendations = scoredRecommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      // Format recommendations with detailed reasons
      return topRecommendations.map(item => {
        const matchingGenres = item.genres?.filter(genre => userGenrePreferences.has(genre)) || [];
        let reason = `Rated ${item.rating}/10 by ${friendName}`;
        
        if (matchingGenres.length > 0) {
          const topGenres = matchingGenres
            .sort((a, b) => {
              const prefA = userGenrePreferences.get(a)?.avgRating || 0;
              const prefB = userGenrePreferences.get(b)?.avgRating || 0;
              return prefB - prefA;
            })
            .slice(0, 2);
          
          reason += ` • Matches your ${topGenres.join(' & ')} preferences`;
        }
        
        return {
          title: item.title,
          posterPath: item.posterPath,
          mediaType: item.mediaType,
          mediaId: item.mediaId,
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
        
        // Get the friend's profile first to display their name
        const profileResponse = await fetchWithAuth(`/api/users/${userId}`);
        
        // Type cast the response to UserProfile
        const userProfile = profileResponse as UserProfile;
        
        if (userProfile && userProfile.displayName) {
          setFriendName(userProfile.displayName);
        } else if (userProfile && userProfile.email) {
          // Fallback to email username if no display name
          const emailUsername = userProfile.email.split('@')[0];
          setFriendName(emailUsername);
        } else {
          setFriendName("User");
        }
        
        const response = await fetchWithAuth(`/api/users/${userId}/watchlist`);
        
        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response from watchlist API');
        }

        const friendWatchlist: WatchlistEntry[] = Array.isArray(response) ? response : [];
        
        // Check if we have enough data
        if (watchlist.length === 0 || friendWatchlist.length === 0) {
          setMatchStats({
            overallMatch: 0,
            commonMovies: [],
            commonShows: [],
            recommendations: [],
            genreMatch: [],
            insightStats: {
              favoriteGenre: 'None yet',
              highestRatedCommon: 'None yet',
              lowestRatedCommon: 'None yet',
              totalMediaCount: 0,
              uniqueGenres: 0,
              quirkyStat: 'Add more content to see fun stats!'
            },
            compatibilityScore: 0,
            taskCompletionRate: 0
          });
          setIsLoading(false);
          return;
        }

        // Find common movies with all metadata
        const commonMovies = watchlist
          .filter(entry => 
            entry.mediaType === 'movie' && 
            friendWatchlist.some(fe => fe.mediaId === entry.mediaId)
          )
          .map(entry => {
            const friendEntry = friendWatchlist.find(fe => fe.mediaId === entry.mediaId);
            return {
              id: entry.id,
              mediaId: entry.mediaId,
              mediaType: 'movie' as const,
              title: entry.title,
              posterPath: entry.posterPath,
              rating: entry.rating,
              friendRating: friendEntry?.rating
            };
          });

        // Find common shows with all metadata
        const commonShows = watchlist
          .filter(entry => 
            entry.mediaType === 'tv' && 
            friendWatchlist.some(fe => fe.mediaId === entry.mediaId)
          )
          .map(entry => {
            const friendEntry = friendWatchlist.find(fe => fe.mediaId === entry.mediaId);
            return {
              id: entry.id,
              mediaId: entry.mediaId,
              mediaType: 'tv' as const,
              title: entry.title,
              posterPath: entry.posterPath,
              rating: entry.rating,
              friendRating: friendEntry?.rating
            };
          });

        // Calculate genre match
        const genreMatch = calculateGenreMatch(watchlist, friendWatchlist);
        
        // Generate recommendations
        const recommendations = await generateRecommendations(watchlist, friendWatchlist);
        
        // Calculate overall match score
        const overallMatch = calculateOverallMatch(
          commonMovies.length, 
          commonShows.length,
          genreMatch
        );

        // Calculate new insight stats
        const insightStats = calculateInsightStats(
          watchlist,
          friendWatchlist,
          commonMovies,
          commonShows,
          genreMatch
        );
        
        // Calculate compatibility score
        const compatibilityScore = calculateCompatibilityScore(watchlist, friendWatchlist);
        
        // Calculate task completion rate
        const taskCompletionRate = calculateTaskCompletionRate(watchlist, friendWatchlist);

        // Set all match stats
        setMatchStats({
          overallMatch,
          commonMovies,
          commonShows,
          recommendations,
          genreMatch,
          insightStats,
          compatibilityScore,
          taskCompletionRate
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

  // Handler for opening media details modal
  const handleMediaClick = (mediaId: number, mediaType: 'movie' | 'tv') => {
    setSelectedMedia({ mediaId, mediaType });
  };

  // Handler for closing media details modal
  const handleCloseModal = () => {
    setSelectedMedia(null);
  };

  // Create a blend playlist of movies and shows
  const createBlendPlaylist = async () => {
    if (!matchStats || !user) return;
    
    // Combine recommendations with common content for a diverse playlist
    const commonContent = [...matchStats.commonMovies, ...matchStats.commonShows];
    const topCommon = commonContent
      .filter(item => item.rating && item.friendRating)
      .sort((a, b) => {
        const avgA = ((a.rating || 0) + (a.friendRating || 0)) / 2;
        const avgB = ((b.rating || 0) + (b.friendRating || 0)) / 2;
        return avgB - avgA;
      })
      .slice(0, 3);
    
    // Add recommendations if we don't have enough common content
    const blendItems = [
      ...topCommon.map(item => ({
        mediaId: item.mediaId,
        mediaType: item.mediaType,
        title: item.title
      })),
      ...matchStats.recommendations.slice(0, 6 - topCommon.length).map(item => ({
        mediaId: item.mediaId,
        mediaType: item.mediaType,
        title: item.title
      }))
    ];
    
    if (blendItems.length === 0) {
      alert('Add more content to create a blend playlist!');
      return;
    }
    
    try {
      // Implementation will depend on your app's backend API
      // For now, just log what would be created
      console.log('Creating blend playlist with:', blendItems);
      
      // This would be replaced with an actual API call:
      // await fetchWithAuth('/api/playlists/blend', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     name: `Blend with User ${userId.slice(0, 6)}`,
      //     items: blendItems,
      //     friendId: userId
      //   })
      // });
      
      alert('Blend playlist created! (This is a mockup - backend implementation needed)');
    } catch (error) {
      console.error('Error creating blend playlist:', error);
      alert('Failed to create blend playlist');
    }
  };

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
            {getMatchDescription(matchStats, friendName)}
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
              {/* Top Stats Section */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center flex flex-col items-center justify-center">
                  <LuHeart className="w-5 h-5 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Match Score</p>
                  <p className="text-lg font-medium">{matchStats.overallMatch}%</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center flex flex-col items-center justify-center">
                  <LuTrophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Compatibility</p>
                  <p className="text-lg font-medium">{matchStats.compatibilityScore}%</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center flex flex-col items-center justify-center">
                  <LuLightbulb className="w-5 h-5 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Completion Rate</p>
                  <p className="text-lg font-medium">{matchStats.taskCompletionRate}%</p>
                </div>
              </div>

              {/* Insight Cards */}
              <div className="bg-white/5 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Fun Insights</h4>
                <p className="text-sm text-gray-400 mb-2">
                  <span className="font-medium text-purple-400">Did you know?</span> {matchStats.insightStats.quirkyStat}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Favorite Genre</p>
                    <p className="text-sm font-medium truncate">{matchStats.insightStats.favoriteGenre}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Total Media</p>
                    <p className="text-sm font-medium">{matchStats.insightStats.totalMediaCount} titles</p>
                  </div>
                </div>
              </div>

              {/* Common Content Section */}
              {(matchStats.commonMovies.length > 0 || matchStats.commonShows.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-300">Common Content</h4>
                    <span className="text-xs text-gray-400">
                      {matchStats.commonMovies.length + matchStats.commonShows.length} titles
                    </span>
                  </div>
                  
                  {/* Using watchlist-style grid layout */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Common Movies */}
                    {matchStats.commonMovies.slice(0, 3).map((movie) => (
                      <div 
                        key={movie.id} 
                        className="cursor-pointer relative group"
                        onClick={() => handleMediaClick(movie.mediaId, movie.mediaType)}
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-1">
                          {movie.posterPath ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                              alt={movie.title}
                              fill
                              className="object-cover"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                              <LuFilm className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Hover overlay with title */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <div className="text-xs font-medium text-white truncate">{movie.title}</div>
                          </div>
                          
                          {/* Rating badges - Now bigger and always visible with labels */}
                          <div className="absolute top-0 left-0 right-0 p-2 flex justify-between">
                            {/* Your rating */}
                            <div className="rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1 text-sm font-bold border border-yellow-500/30 shadow-lg text-yellow-400 transform -rotate-3 transition-transform group-hover:rotate-0">
                              <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-wider opacity-70 mb-0.5">You</span>
                                <span className="font-mono text-base">{movie.rating || '?'}</span>
                              </div>
                            </div>
                            
                            {/* Friend rating */}
                            <div className="rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1 text-sm font-bold border border-purple-500/30 shadow-lg text-purple-400 transform rotate-3 transition-transform group-hover:rotate-0">
                              <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-wider opacity-70 mb-0.5">{friendName || 'User'}</span>
                                <span className="font-mono text-base">{movie.friendRating || '?'}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mini-comparison badge */}
                          {movie.rating && movie.friendRating && (
                            <div className="absolute bottom-2 right-2 rounded-full w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-lg opacity-70 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                              {movie.rating === movie.friendRating ? (
                                <span className="text-green-400 text-xs font-bold">
                                  100%
                                </span>
                              ) : (
                                <span className={`text-xs font-bold ${Math.abs(movie.rating - (movie.friendRating || 0)) <= 2 ? 'text-blue-400' : 'text-orange-400'}`}>
                                  {Math.max(0, 100 - Math.abs(movie.rating - (movie.friendRating || 0)) * 10)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Common Shows */}
                    {matchStats.commonShows.slice(0, 3).map((show) => (
                      <div 
                        key={show.id}
                        className="cursor-pointer relative group"
                        onClick={() => handleMediaClick(show.mediaId, show.mediaType)}
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-1">
                          {show.posterPath ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w342${show.posterPath}`}
                              alt={show.title}
                              fill
                              className="object-cover"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                              <LuTv className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Hover overlay with title */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <div className="text-xs font-medium text-white truncate">{show.title}</div>
                          </div>
                          
                          {/* Rating badges - Now bigger and always visible with labels */}
                          <div className="absolute top-0 left-0 right-0 p-2 flex justify-between">
                            {/* Your rating */}
                            <div className="rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1 text-sm font-bold border border-yellow-500/30 shadow-lg text-yellow-400 transform -rotate-3 transition-transform group-hover:rotate-0">
                              <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-wider opacity-70 mb-0.5">You</span>
                                <span className="font-mono text-base">{show.rating || '?'}</span>
                              </div>
                            </div>
                            
                            {/* Friend rating */}
                            <div className="rounded-md bg-black/70 backdrop-blur-sm px-2.5 py-1 text-sm font-bold border border-purple-500/30 shadow-lg text-purple-400 transform rotate-3 transition-transform group-hover:rotate-0">
                              <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-wider opacity-70 mb-0.5">{friendName || 'User'}</span>
                                <span className="font-mono text-base">{show.friendRating || '?'}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mini-comparison badge */}
                          {show.rating && show.friendRating && (
                            <div className="absolute bottom-2 right-2 rounded-full w-8 h-8 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-lg opacity-70 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                              {show.rating === show.friendRating ? (
                                <span className="text-green-400 text-xs font-bold">
                                  100%
                                </span>
                              ) : (
                                <span className={`text-xs font-bold ${Math.abs(show.rating - (show.friendRating || 0)) <= 2 ? 'text-blue-400' : 'text-orange-400'}`}>
                                  {Math.max(0, 100 - Math.abs(show.rating - (show.friendRating || 0)) * 10)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* More Button (if there are more items) */}
                    {(matchStats.commonMovies.length + matchStats.commonShows.length) > 6 && (
                      <div 
                        className="aspect-[2/3] rounded-lg overflow-hidden flex items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => alert('View all common content (implementation needed)')}
                      >
                        <div className="text-center p-4">
                          <div className="bg-white/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                            <LuFilter className="w-5 h-5 text-gray-300" />
                          </div>
                          <p className="text-sm text-gray-300">View All</p>
                          <p className="text-xs text-gray-400">
                            {matchStats.commonMovies.length + matchStats.commonShows.length} titles
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Genre Match Section */}
              {matchStats.genreMatch.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Genre Match</h4>
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
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-300">Recommendations</h4>
                    <button 
                      onClick={createBlendPlaylist}
                      className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg flex items-center gap-1 hover:bg-purple-500/30 transition-colors"
                    >
                      <LuPlay className="w-3 h-3" />
                      <span>Create Blend</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {matchStats.recommendations.map((item, index) => (
                      <div 
                        key={index} 
                        className="space-y-2 cursor-pointer"
                        onClick={() => handleMediaClick(item.mediaId, item.mediaType)}
                      >
                        <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-white/5">
                          {item.posterPath ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w342${item.posterPath}`}
                              alt={item.title}
                              fill
                              className="object-cover"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
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
                          
                          {/* Recommendation badge */}
                          <div className="absolute top-2 right-2 rounded-md bg-purple-500/30 backdrop-blur-sm px-2 py-1 text-xs font-medium text-purple-300 border border-purple-500/20">
                            <span className="flex items-center gap-1">
                              <LuStar className="w-3 h-3" />
                              <span>Recommended</span>
                            </span>
                          </div>
                          
                          {/* Hover overlay with reason */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <div className="text-xs text-gray-300">{item.reason}</div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium truncate">{item.title}</h5>
                          <p className="text-xs text-gray-400 line-clamp-1">{item.mediaType === 'movie' ? 'Movie' : 'TV Show'}</p>
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
      
      {/* Media Details Modal */}
      {selectedMedia && (
        <MediaDetailsModal
          mediaId={selectedMedia.mediaId}
          mediaType={selectedMedia.mediaType}
          onClose={handleCloseModal}
        />
      )}
    </motion.div>
  );
}

/**
 * Get a descriptive match description based on the match stats
 */
const getMatchDescription = (matchStats: MatchStats, name: string = "User"): string => {
  if (matchStats.commonMovies.length === 0 && matchStats.commonShows.length === 0) {
    return `No common content with ${name} yet`;
  }

  const commonCount = matchStats.commonMovies.length + matchStats.commonShows.length;
  
  if (matchStats.overallMatch > 80) {
    return `Excellent match with ${name}! ${commonCount} shared titles`;
  } else if (matchStats.overallMatch > 60) {
    return `Strong match with ${name}: ${commonCount} shared titles`;
  } else if (matchStats.overallMatch > 40) {
    return `Good match with ${name}: ${commonCount} shared titles`;
  } else {
    return `You share ${commonCount} titles with ${name}`;
  }
}; 
