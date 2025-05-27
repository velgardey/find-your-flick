"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/api';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { LuChevronDown, LuUsers, LuFilm, LuTv, LuStar, LuClock } from 'react-icons/lu';
import { fetchMediaDetails } from '@/lib/mediaUtils';

import StatCard from './ui/StatCard';

interface TasteMatchProps {
  userId: string;
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
  updatedAt: string;
}

interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string;
      profile_path?: string | null;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job?: string;
      profile_path?: string | null;
    }>;
  };
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_episodes?: number;
}

interface Director {
  id: number;
  name: string;
  count: number;
  profilePath?: string | null;
}

interface Actor {
  id: number;
  name: string;
  count: number;
  profilePath?: string | null;
}

interface TasteMatchData {
  overallScore: number;
  genreScore: number;
  directorScore: number;
  actorScore: number;
  decadeScore: number;
  commonGenres: Array<{ id: number; name: string; userCount: number; friendCount: number; matchScore: number }>;
  commonDirectors: Array<Director & { matchScore: number }>;
  commonActors: Array<Actor & { matchScore: number }>;
  decadePreferences: Record<string, { user: number; friend: number; matchScore: number }>;
  controversialPicks: Array<{ mediaId: number; mediaType: 'movie' | 'tv'; title: string; posterPath: string | null; userRating: number | null; friendRating: number | null }>;
  sharedDiscoveries: number;
  tastePersonality: string;
}

export default function TasteMatch({ userId }: TasteMatchProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { watchlist: currentUserWatchlist } = useWatchlist();
  const [friendWatchlist, setFriendWatchlist] = useState<WatchlistEntry[] | null>(null);
  const [tasteMatchData, setTasteMatchData] = useState<TasteMatchData | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv'>('movie');
  const { } = useAuth(); // Auth context still needed for authentication state

  // Fetch friend's watchlist
  useEffect(() => {
    const fetchFriendWatchlist = async () => {
      if (!userId) return;
      
      try {
        const response = await fetchWithAuth(`/api/users/${userId}/watchlist`);
        if (Array.isArray(response)) {
          setFriendWatchlist(response);
        }
      } catch (error) {
        console.error('Error fetching friend watchlist:', error);
        setError('Failed to load taste match data');
      }
    };

    if (userId) {
      fetchFriendWatchlist();
    }
  }, [userId]);

  // Calculate taste match when both watchlists are available
  useEffect(() => {
    const calculateTasteMatch = async () => {
      if (!currentUserWatchlist || !friendWatchlist) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Filter watched entries by media type for both users
        const userWatchedEntries = currentUserWatchlist.filter((entry) => 
          entry.status === 'WATCHED' && entry.mediaType === selectedMediaType
        );
        
        const friendWatchedEntries = friendWatchlist.filter((entry) => 
          entry.status === 'WATCHED' && entry.mediaType === selectedMediaType
        );

        if (userWatchedEntries.length === 0 || friendWatchedEntries.length === 0) {
          setTasteMatchData(null);
          setIsLoading(false);
          return;
        }

        // Fetch details for user's watched media
        const userMediaDetails = await Promise.all(
          userWatchedEntries.map(async (entry) => {
            try {
              const mediaDetails = await fetchMediaDetails(entry.mediaType, entry.mediaId, {
                appendToResponse: ['credits']
              }); 
              return { ...mediaDetails, userRating: entry.rating };
            } catch (error) {
              console.error(`Error fetching details for ${entry.mediaType} ${entry.mediaId}:`, error);
              return null;
            }
          })
        );

        // Fetch details for friend's watched media
        const friendMediaDetails = await Promise.all(
          friendWatchedEntries.map(async (entry) => {
            try {
              const mediaDetails = await fetchMediaDetails(entry.mediaType, entry.mediaId, {
                appendToResponse: ['credits']
              });
              return { ...mediaDetails, friendRating: entry.rating };
            } catch (error) {
              console.error(`Error fetching details for ${entry.mediaType} ${entry.mediaId}:`, error);
              return null;
            }
          })
        );

        // Filter out failed requests
        const validUserMediaDetails = userMediaDetails.filter(Boolean) as (MediaDetails & { userRating: number | null })[];
        const validFriendMediaDetails = friendMediaDetails.filter(Boolean) as (MediaDetails & { friendRating: number | null })[];

        if (validUserMediaDetails.length === 0 || validFriendMediaDetails.length === 0) {
          setTasteMatchData(null);
          setIsLoading(false);
          return;
        }

        // Calculate taste match data
        const matchData = calculateMatchData(validUserMediaDetails, validFriendMediaDetails, selectedMediaType);
        setTasteMatchData(matchData);
      } catch (error) {
        console.error('Error calculating taste match:', error);
        setError('Failed to calculate taste match. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    calculateTasteMatch();
  }, [currentUserWatchlist, friendWatchlist, selectedMediaType]);

  // Function to calculate taste match data
  const calculateMatchData = (
    userMedia: (MediaDetails & { userRating: number | null })[], 
    friendMedia: (MediaDetails & { friendRating: number | null })[], 
    mediaType: 'movie' | 'tv'
  ): TasteMatchData => {
    // Process user's genre preferences
    const userGenreCounts: Record<number, { id: number; name: string; count: number }> = {};
    const friendGenreCounts: Record<number, { id: number; name: string; count: number }> = {};
    
    // Process user's director/creator preferences
    const userDirectorCounts: Record<number, Director> = {};
    const friendDirectorCounts: Record<number, Director> = {};
    
    // Process user's actor preferences
    const userActorCounts: Record<number, Actor> = {};
    const friendActorCounts: Record<number, Actor> = {};
    
    // Process decade preferences
    const userDecadeCounts: Record<string, number> = {};
    const friendDecadeCounts: Record<string, number> = {};
    
    // Find media that both users have watched (for controversial picks)
    const sharedMediaIds = new Set<number>();
    const userMediaMap = new Map<number, MediaDetails & { userRating: number | null }>();
    const friendMediaMap = new Map<number, MediaDetails & { friendRating: number | null }>();
    
    // Process user media
    userMedia.forEach(media => {
      // Store in map for later comparison
      userMediaMap.set(media.id, media);
      
      // Process genres
      media.genres?.forEach(genre => {
        if (!userGenreCounts[genre.id]) {
          userGenreCounts[genre.id] = { id: genre.id, name: genre.name, count: 0 };
        }
        userGenreCounts[genre.id].count++;
      });
      
      // Process directors/creators
      if (mediaType === 'movie') {
        const directors = media.credits?.crew?.filter(person => person.job === 'Director') || [];
        directors.forEach(director => {
          if (!userDirectorCounts[director.id]) {
            userDirectorCounts[director.id] = {
              id: director.id,
              name: director.name,
              count: 0,
              profilePath: director.profile_path || null
            };
          }
          userDirectorCounts[director.id].count++;
        });
      } else {
        const creators = media.credits?.crew?.filter(person => 
          person.job === 'Creator' || 
          person.job === 'Executive Producer' || 
          person.job === 'Showrunner'
        ) || [];
        creators.forEach(creator => {
          if (!userDirectorCounts[creator.id]) {
            userDirectorCounts[creator.id] = {
              id: creator.id,
              name: creator.name,
              count: 0,
              profilePath: creator.profile_path || null
            };
          }
          userDirectorCounts[creator.id].count++;
        });
      }
      
      // Process actors
      const actors = media.credits?.cast?.slice(0, 5) || []; // Consider top 5 actors
      actors.forEach(actor => {
        if (!userActorCounts[actor.id]) {
          userActorCounts[actor.id] = {
            id: actor.id,
            name: actor.name,
            count: 0,
            profilePath: actor.profile_path || null
          };
        }
        userActorCounts[actor.id].count++;
      });
      
      // Process decade
      const releaseDate = mediaType === 'movie' ? media.release_date : media.first_air_date;
      if (releaseDate) {
        const year = new Date(releaseDate).getFullYear();
        const decade = Math.floor(year / 10) * 10 + 's';
        if (!userDecadeCounts[decade]) {
          userDecadeCounts[decade] = 0;
        }
        userDecadeCounts[decade]++;
      }
    });
    
    // Process friend media
    friendMedia.forEach(media => {
      // Store in map for later comparison
      friendMediaMap.set(media.id, media);
      
      // Check if both users watched this
      if (userMediaMap.has(media.id)) {
        sharedMediaIds.add(media.id);
      }
      
      // Process genres
      media.genres?.forEach(genre => {
        if (!friendGenreCounts[genre.id]) {
          friendGenreCounts[genre.id] = { id: genre.id, name: genre.name, count: 0 };
        }
        friendGenreCounts[genre.id].count++;
      });
      
      // Process directors/creators
      if (mediaType === 'movie') {
        const directors = media.credits?.crew?.filter(person => person.job === 'Director') || [];
        directors.forEach(director => {
          if (!friendDirectorCounts[director.id]) {
            friendDirectorCounts[director.id] = {
              id: director.id,
              name: director.name,
              count: 0,
              profilePath: director.profile_path || null
            };
          }
          friendDirectorCounts[director.id].count++;
        });
      } else {
        const creators = media.credits?.crew?.filter(person => 
          person.job === 'Creator' || 
          person.job === 'Executive Producer' || 
          person.job === 'Showrunner'
        ) || [];
        creators.forEach(creator => {
          if (!friendDirectorCounts[creator.id]) {
            friendDirectorCounts[creator.id] = {
              id: creator.id,
              name: creator.name,
              count: 0,
              profilePath: creator.profile_path || null
            };
          }
          friendDirectorCounts[creator.id].count++;
        });
      }
      
      // Process actors
      const actors = media.credits?.cast?.slice(0, 5) || []; // Consider top 5 actors
      actors.forEach(actor => {
        if (!friendActorCounts[actor.id]) {
          friendActorCounts[actor.id] = {
            id: actor.id,
            name: actor.name,
            count: 0,
            profilePath: actor.profile_path || null
          };
        }
        friendActorCounts[actor.id].count++;
      });
      
      // Process decade
      const releaseDate = mediaType === 'movie' ? media.release_date : media.first_air_date;
      if (releaseDate) {
        const year = new Date(releaseDate).getFullYear();
        const decade = Math.floor(year / 10) * 10 + 's';
        if (!friendDecadeCounts[decade]) {
          friendDecadeCounts[decade] = 0;
        }
        friendDecadeCounts[decade]++;
      }
    });
    
    // Calculate genre match score
    const commonGenres = Object.keys(userGenreCounts)
      .filter(id => friendGenreCounts[Number(id)])
      .map(id => {
        const numId = Number(id);
        const userCount = userGenreCounts[numId].count;
        const friendCount = friendGenreCounts[numId].count;
        const totalUserGenres = Object.values(userGenreCounts).reduce((sum, g) => sum + g.count, 0);
        const totalFriendGenres = Object.values(friendGenreCounts).reduce((sum, g) => sum + g.count, 0);
        
        // Calculate how important this genre is to each user
        const userImportance = userCount / totalUserGenres;
        const friendImportance = friendCount / totalFriendGenres;
        
        // Calculate match score based on how similar their preferences are
        const matchScore = 100 - (Math.abs(userImportance - friendImportance) * 100);
        
        return {
          id: numId,
          name: userGenreCounts[numId].name,
          userCount,
          friendCount,
          matchScore
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
    
    // Calculate genre score (weighted average of match scores)
    const genreScore = commonGenres.length > 0 ?
      Math.round(commonGenres.reduce((sum, g) => sum + g.matchScore, 0) / commonGenres.length) :
      0;
    
    // Calculate director match score
    const commonDirectors = Object.keys(userDirectorCounts)
      .filter(id => friendDirectorCounts[Number(id)])
      .map(id => {
        const numId = Number(id);
        const userCount = userDirectorCounts[numId].count;
        const friendCount = friendDirectorCounts[numId].count;
        const totalUserDirectors = Object.values(userDirectorCounts).reduce((sum, d) => sum + d.count, 0);
        const totalFriendDirectors = Object.values(friendDirectorCounts).reduce((sum, d) => sum + d.count, 0);
        
        // Calculate importance
        const userImportance = userCount / totalUserDirectors;
        const friendImportance = friendCount / totalFriendDirectors;
        
        // Calculate match score
        const matchScore = 100 - (Math.abs(userImportance - friendImportance) * 100);
        
        return {
          ...userDirectorCounts[numId],
          matchScore
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
    
    // Calculate director score
    const directorScore = commonDirectors.length > 0 ?
      Math.round(commonDirectors.reduce((sum, d) => sum + d.matchScore, 0) / commonDirectors.length) :
      0;
    
    // Calculate actor match score
    const commonActors = Object.keys(userActorCounts)
      .filter(id => friendActorCounts[Number(id)])
      .map(id => {
        const numId = Number(id);
        const userCount = userActorCounts[numId].count;
        const friendCount = friendActorCounts[numId].count;
        const totalUserActors = Object.values(userActorCounts).reduce((sum, a) => sum + a.count, 0);
        const totalFriendActors = Object.values(friendActorCounts).reduce((sum, a) => sum + a.count, 0);
        
        // Calculate importance
        const userImportance = userCount / totalUserActors;
        const friendImportance = friendCount / totalFriendActors;
        
        // Calculate match score
        const matchScore = 100 - (Math.abs(userImportance - friendImportance) * 100);
        
        return {
          ...userActorCounts[numId],
          matchScore
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
    
    // Calculate actor score
    const actorScore = commonActors.length > 0 ?
      Math.round(commonActors.reduce((sum, a) => sum + a.matchScore, 0) / commonActors.length) :
      0;
    
    // Calculate decade preferences match
    const decadePreferences: Record<string, { user: number; friend: number; matchScore: number }> = {};
    const allDecades = new Set([...Object.keys(userDecadeCounts), ...Object.keys(friendDecadeCounts)]);
    
    const totalUserDecades = Object.values(userDecadeCounts).reduce((sum, count) => sum + count, 0);
    const totalFriendDecades = Object.values(friendDecadeCounts).reduce((sum, count) => sum + count, 0);
    
    allDecades.forEach(decade => {
      const userCount = userDecadeCounts[decade] || 0;
      const friendCount = friendDecadeCounts[decade] || 0;
      
      // Calculate importance
      const userImportance = totalUserDecades > 0 ? userCount / totalUserDecades : 0;
      const friendImportance = totalFriendDecades > 0 ? friendCount / totalFriendDecades : 0;
      
      // Calculate match score
      const matchScore = 100 - (Math.abs(userImportance - friendImportance) * 100);
      
      decadePreferences[decade] = {
        user: userCount,
        friend: friendCount,
        matchScore
      };
    });
    
    // Calculate decade score
    const decadeScore = Object.keys(decadePreferences).length > 0 ?
      Math.round(Object.values(decadePreferences).reduce((sum, d) => sum + d.matchScore, 0) / Object.keys(decadePreferences).length) :
      0;
    
    // Find controversial picks (both watched but rated differently)
    const controversialPicks = Array.from(sharedMediaIds)
      .map(id => {
        const userMedia = userMediaMap.get(id)!;
        const friendMedia = friendMediaMap.get(id)!;
        
        const userRating = userMedia.userRating;
        const friendRating = friendMedia.friendRating;
        
        // Only include if both users rated the media
        if (userRating === null || friendRating === null) {
          return null;
        }
        
        // Calculate rating difference
        const ratingDiff = Math.abs(userRating - friendRating);
        
        // Only consider as controversial if difference is significant (2+ points)
        if (ratingDiff < 2) {
          return null;
        }
        
        return {
          mediaId: userMedia.id,
          mediaType,
          title: mediaType === 'movie' ? userMedia.title || '' : userMedia.name || '',
          posterPath: (userMedia as { poster_path?: string }).poster_path || null,
          userRating,
          friendRating
        };
      })
      .filter(Boolean) as Array<{ 
        mediaId: number; 
        mediaType: 'movie' | 'tv'; 
        title: string; 
        posterPath: string | null; 
        userRating: number | null; 
        friendRating: number | null 
      }>;
    
    // Calculate overall score with weighted components
    const weights = {
      genre: 0.4,      // 40%
      director: 0.25,  // 25%
      actor: 0.2,      // 20%
      decade: 0.15     // 15%
    };
    
    const overallScore = Math.round(
      genreScore * weights.genre +
      directorScore * weights.director +
      actorScore * weights.actor +
      decadeScore * weights.decade
    );
    
    // Determine taste personality based on overall score
    let tastePersonality = 'Casual Acquaintances';
    if (overallScore >= 90) {
      tastePersonality = 'Taste Twins';
    } else if (overallScore >= 80) {
      tastePersonality = 'Cinema Soulmates';
    } else if (overallScore >= 70) {
      tastePersonality = 'Film Buddies';
    } else if (overallScore >= 60) {
      tastePersonality = 'Movie Mates';
    } else if (overallScore >= 50) {
      tastePersonality = 'Screen Partners';
    } else if (overallScore >= 40) {
      tastePersonality = 'Viewing Variety';
    } else if (overallScore >= 30) {
      tastePersonality = 'Different Tastes';
    } else if (overallScore >= 20) {
      tastePersonality = 'Opposite Critics';
    } else {
      tastePersonality = 'Cinema Opposites';
    }
    
    return {
      overallScore,
      genreScore,
      directorScore,
      actorScore,
      decadeScore,
      commonGenres: commonGenres.slice(0, 5), // Top 5 common genres
      commonDirectors: commonDirectors.slice(0, 3), // Top 3 common directors
      commonActors: commonActors.slice(0, 3), // Top 3 common actors
      decadePreferences,
      controversialPicks: controversialPicks.slice(0, 5), // Top 5 controversial picks
      sharedDiscoveries: sharedMediaIds.size,
      tastePersonality
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-800 rounded-xl" />
          <div className="h-24 bg-gray-800 rounded-xl" />
          <div className="h-24 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // If there's no match data, show empty state
  if (!tasteMatchData) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center p-8 space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2 
          }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center"
        >
          <LuUsers className="w-16 h-16 text-white/60" />
        </motion.div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">
            Not Enough Data
          </h3>
          <p className="text-gray-400 max-w-md">
            We need more watched {selectedMediaType === 'movie' ? 'movies' : 'TV shows'} from both users to calculate a taste match.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TasteMatch Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-white/10">
            <LuUsers className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-medium">
              Taste Match
            </h3>
            <p className="text-sm text-gray-400">
              {`${tasteMatchData.overallScore}% match • ${tasteMatchData.tastePersonality}`}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <LuChevronDown className="w-6 h-6" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Media Type Toggle */}
            <div className="flex justify-center">
              <div className="bg-black/20 backdrop-blur-xl rounded-full p-1 flex gap-1">
                <motion.button
                  onClick={() => setSelectedMediaType('movie')}
                  className={`px-6 py-2 rounded-full transition-all duration-200 ${
                    selectedMediaType === 'movie'
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-2">
                    <LuFilm className="w-4 h-4" />
                    <span>Movies</span>
                  </span>
                </motion.button>
                <motion.button
                  onClick={() => setSelectedMediaType('tv')}
                  className={`px-6 py-2 rounded-full transition-all duration-200 ${
                    selectedMediaType === 'tv'
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-2">
                    <LuTv className="w-4 h-4" />
                    <span>TV Shows</span>
                  </span>
                </motion.button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}

            {/* Match Score Circle */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="#1a1a1a" 
                    strokeWidth="10"
                  />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="url(#gradient)" 
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 45 * tasteMatchData.overallScore / 100} ${2 * Math.PI * 45 * (100 - tasteMatchData.overallScore) / 100}`}
                    strokeDashoffset={2 * Math.PI * 45 * 0.25}
                    transform="rotate(-90 50 50)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-4xl font-bold">{tasteMatchData.overallScore}%</span>
                  <span className="text-sm text-gray-400">Match Score</span>
                </div>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-xl font-semibold">{tasteMatchData.tastePersonality}</h3>
                <p className="text-sm text-gray-400">Based on your watching habits</p>
              </div>
            </div>

            {/* Category Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Genre Match"
                value={`${tasteMatchData.genreScore}%`}
                icon={LuFilm}
                color="purple"
              />
              <StatCard
                title="Director Match"
                value={`${tasteMatchData.directorScore}%`}
                icon={LuUsers}
                color="blue"
              />
              <StatCard
                title="Actor Match"
                value={`${tasteMatchData.actorScore}%`}
                icon={LuStar}
                color="yellow"
              />
              <StatCard
                title="Era Match"
                value={`${tasteMatchData.decadeScore}%`}
                icon={LuClock}
                color="green"
              />
            </div>

            {/* Common Genres */}
            {tasteMatchData.commonGenres.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 mb-6"
              >
                <h3 className="text-xl font-semibold mb-4">Common Genre Interests</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {tasteMatchData.commonGenres.map((genre, index) => (
                    <motion.div
                      key={genre.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 backdrop-blur-lg rounded-lg p-4 text-center border border-white/10"
                    >
                      <div className="text-lg font-medium">{genre.name}</div>
                      <div className="text-sm text-gray-400">
                        {Math.round(genre.matchScore)}% match
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Both enjoy this genre
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Common Directors/Creators */}
            {tasteMatchData.commonDirectors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 mb-6"
              >
                <h3 className="text-xl font-semibold mb-4">
                  {selectedMediaType === 'movie' ? 'Shared Favorite Directors' : 'Shared Favorite Creators'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tasteMatchData.commonDirectors.map((director, index) => (
                    <motion.div
                      key={director.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 bg-white/5 backdrop-blur-lg rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/10">
                        {director.profilePath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${director.profilePath}`}
                            alt={director.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            priority={index < 3}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-white/60">
                            {director.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{director.name}</div>
                        <div className="text-sm text-gray-400">
                          {Math.round(director.matchScore)}% match
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Common Actors */}
            {tasteMatchData.commonActors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 mb-6"
              >
                <h3 className="text-xl font-semibold mb-4">Shared Favorite Actors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tasteMatchData.commonActors.map((actor, index) => (
                    <motion.div
                      key={actor.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 bg-white/5 backdrop-blur-lg rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/10">
                        {actor.profilePath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`}
                            alt={actor.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            priority={index < 3}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-white/60">
                            {actor.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{actor.name}</div>
                        <div className="text-sm text-gray-400">
                          {Math.round(actor.matchScore)}% match
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Decade Preferences */}
            {Object.keys(tasteMatchData.decadePreferences).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 mb-6"
              >
                <h3 className="text-xl font-semibold mb-4">Era Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {Object.entries(tasteMatchData.decadePreferences)
                    .sort(([a], [b]) => Number(a.replace('s', '')) - Number(b.replace('s', '')))
                    .map(([decade, data], index) => (
                      <motion.div
                        key={decade}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 backdrop-blur-lg rounded-lg p-4 text-center border border-white/10"
                      >
                        <div className="text-2xl font-bold">{decade}</div>
                        <div className="text-sm text-gray-400 mt-1">
                          {Math.round(data.matchScore)}% match
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex justify-between">
                          <span>You: {data.user}</span>
                          <span>Friend: {data.friend}</span>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Controversial Picks */}
            {tasteMatchData.controversialPicks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 mb-6"
              >
                <h3 className="text-xl font-semibold mb-4">Controversial Picks</h3>
                <p className="text-gray-400 mb-4">Titles you both rated differently</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {tasteMatchData.controversialPicks.map((pick, index) => (
                    <motion.div
                      key={pick.mediaId}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 backdrop-blur-lg rounded-lg overflow-hidden border border-white/10"
                    >
                      <div className="relative aspect-[2/3] w-full">
                        {pick.posterPath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${pick.posterPath}`}
                            alt={pick.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 200px"
                            className="object-cover"
                            priority={index < 2}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-400 text-sm text-center px-4">No poster</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm truncate">{pick.title}</h4>
                        <div className="flex justify-between mt-2 text-sm">
                          <div className="text-blue-400">You: {pick.userRating}/10</div>
                          <div className="text-purple-400">Friend: {pick.friendRating}/10</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Fun Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-4">Fun Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Shared Discoveries</span>
                    <span className="font-medium">{tasteMatchData.sharedDiscoveries} {selectedMediaType === 'movie' ? 'movies' : 'shows'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Common Genres</span>
                    <span className="font-medium">{tasteMatchData.commonGenres.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Favorite Decade</span>
                    <span className="font-medium">
                      {Object.entries(tasteMatchData.decadePreferences)
                        .sort(([, a], [, b]) => (a.matchScore > b.matchScore ? -1 : 1))[0]?.[0] || 'None'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Taste Compatibility</span>
                    <span className="font-medium">
                      {tasteMatchData.overallScore >= 75 ? 'High' : 
                       tasteMatchData.overallScore >= 50 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Controversial Picks</span>
                    <span className="font-medium">{tasteMatchData.controversialPicks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Recommendation Potential</span>
                    <span className="font-medium">
                      {tasteMatchData.overallScore >= 70 ? 'Excellent' : 
                       tasteMatchData.overallScore >= 50 ? 'Good' : 'Limited'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


