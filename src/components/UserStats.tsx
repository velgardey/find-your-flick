'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { LuChevronDown, LuClock, LuTrendingUp, LuActivity, LuStar, LuFilm, LuTv } from 'react-icons/lu';
import Image from 'next/image';

// Create motion components
// const MotionImage = motion.create(Image);

interface WatchlistEntry {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  status: string;
  rating: number | null;
  updatedAt: string;
}

interface Genre {
  id: number;
  name: string;
  count: number;
}

interface Director {
  id: number;
  name: string;
  count: number;
  profilePath: string | null;
}

interface MediaDetails {
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    crew?: Array<{
      id: number;
      name: string;
      job: string;
      profile_path: string | null;
    }>;
  };
  runtime?: number;
  episode_run_time?: number[];
  number_of_episodes?: number;
  name?: string;
  error?: string;
}

interface UserStats {
  totalWatched: {
    movies: number;
    shows: number;
  };
  totalWatchtime: {
    movies: number;
    shows: number;
  };
  averageRating: {
    movies: number;
    shows: number;
  };
  topGenres: {
    movies: Genre[];
    shows: Genre[];
  };
  topDirectors: Director[];
  topShowCreators: Director[];
  watchingStreak: number;
  favoriteDecade: {
    movies: { decade: string; count: number };
    shows: { decade: string; count: number };
  };
  watchTimeByMonth: {
    movies: { month: string; minutes: number }[];
    shows: { month: string; minutes: number }[];
  };
  completionRate: {
    movies: number;
    shows: number;
  };
  averageEpisodesPerShow: number;
  totalEpisodesWatched: number;
  longestShow: {
    title: string;
    episodes: number;
  };
  longestBinge: number;
  mostInOneDay: number;
  averageSession: number;
  decadeCounts: Record<string, number>;
}

interface Props {
  userId: string;
}

type MediaType = 'movie' | 'tv';

interface IconComponent {
  className?: string;
}

function StatCard({ 
  title, 
  value, 
  icon: Icon,
  subtitle,
  color = 'default'
}: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<IconComponent>;
  subtitle?: string;
  color?: 'default' | 'purple' | 'blue' | 'green' | 'yellow';
}) {
  const colorClasses = {
    default: 'from-white/10 to-white/5',
    purple: 'from-purple-500/20 to-purple-500/5',
    blue: 'from-blue-500/20 to-blue-500/5',
    green: 'from-green-500/20 to-green-500/5',
    yellow: 'from-yellow-500/20 to-yellow-500/5',
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color]} p-6 border border-white/10`}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 opacity-10">
        <Icon className="w-full h-full" />
      </div>
      <div className="relative">
        <div className="text-gray-400 text-sm">{title}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-2">{subtitle}</div>
        )}
      </div>
    </motion.div>
  );
}

export default function UserStats({ userId }: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { watchlist } = useWatchlist();
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('movie');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const calculateStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Filter watched entries by media type
        const watchedEntries = watchlist.filter((entry) => 
          entry.status === 'WATCHED' && entry.mediaType === selectedMediaType
        ) as WatchlistEntry[];

        if (watchedEntries.length === 0) {
          setStats({
            totalWatched: { movies: 0, shows: 0 },
            totalWatchtime: { movies: 0, shows: 0 },
            averageRating: { movies: 0, shows: 0 },
            topGenres: { movies: [], shows: [] },
            topDirectors: [],
            topShowCreators: [],
            watchingStreak: 0,
            favoriteDecade: {
              movies: { decade: '', count: 0 },
              shows: { decade: '', count: 0 }
            },
            watchTimeByMonth: {
              movies: [],
              shows: []
            },
            completionRate: { movies: 0, shows: 0 },
            averageEpisodesPerShow: 0,
            totalEpisodesWatched: 0,
            longestShow: { title: '', episodes: 0 },
            longestBinge: 0,
            mostInOneDay: 0,
            averageSession: 0,
            decadeCounts: {}
          });
          setIsLoading(false);
          return;
        }

        // Fetch details for the selected media type
        const mediaDetails = await Promise.all(
          watchedEntries.map(async (entry) => {
            try {
              const response = await fetch(`/api/tmdb?path=/${entry.mediaType}/${entry.mediaId}&append_to_response=credits`, {
                headers: {
                  'Accept': 'application/json'
                }
              });
              
              const data = await response.json() as MediaDetails;
              
              if (!response.ok) {
                console.error(`Error fetching details for ${entry.mediaType} ${entry.mediaId}:`, data.error);
                return null;
              }
              
              return data;
            } catch (error) {
              console.error(`Error fetching details for ${entry.mediaType} ${entry.mediaId}:`, error);
              return null;
            }
          })
        );

        // Filter out failed requests
        const validMediaDetails = mediaDetails.filter((detail): detail is NonNullable<typeof detail> => detail !== null);

        if (validMediaDetails.length === 0) {
          setStats(prevStats => ({
            ...(prevStats || {
              totalWatched: { movies: 0, shows: 0 },
              totalWatchtime: { movies: 0, shows: 0 },
              averageRating: { movies: 0, shows: 0 },
              topGenres: { movies: [], shows: [] },
              topDirectors: [],
              topShowCreators: [],
              watchingStreak: 0,
              favoriteDecade: {
                movies: { decade: '', count: 0 },
                shows: { decade: '', count: 0 }
              },
              watchTimeByMonth: {
                movies: [],
                shows: []
              },
              completionRate: { movies: 0, shows: 0 },
              averageEpisodesPerShow: 0,
              totalEpisodesWatched: 0,
              longestShow: { title: '', episodes: 0 },
              longestBinge: 0,
              mostInOneDay: 0,
              averageSession: 0,
              decadeCounts: {}
            })
          }));
          setIsLoading(false);
          return;
        }

        // Process media details
        const genreCounts: Record<number, { id: number; name: string; count: number }> = {};
        const creatorCounts: Record<number, Director> = {};
        let totalRuntime = 0;
        let totalRating = 0;
        let ratingCount = 0;
        let totalEpisodes = 0;
        let longestShow = { title: '', episodes: 0 };
        let longestBinge = 0;
        let mostInOneDay = 0;
        let averageSession = 0;
        const decadeCounts: Record<string, number> = {};
        const bingesByDate: Record<string, {
          count: number;
          totalRuntime: number;
          entries: Array<{ timestamp: number; runtime: number }>;
        }> = {};

        // Get last 12 months for watch time tracking
        const last12Months = Array.from({ length: 12 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          return d.toISOString().slice(0, 7);
        }).reverse();

        const watchTimeByMonth: Record<string, number> = {};
        last12Months.forEach(month => {
          watchTimeByMonth[month] = 0;
        });

        validMediaDetails.forEach((media, index) => {
          // Process genres
          media.genres?.forEach((genre: { id: number; name: string }) => {
            if (!genreCounts[genre.id]) {
              genreCounts[genre.id] = { id: genre.id, name: genre.name, count: 0 };
            }
            genreCounts[genre.id].count++;
          });

          // Process creators and TV show specific stats
          if (selectedMediaType === 'movie') {
            const director = media.credits?.crew?.find((person) => person.job === 'Director');
            if (director) {
              if (!creatorCounts[director.id]) {
                creatorCounts[director.id] = {
                  id: director.id,
                  name: director.name,
                  count: 0,
                  profilePath: director.profile_path
                };
              }
              creatorCounts[director.id].count++;
            }
          } else {
            const episodeCount = media.number_of_episodes ?? 0;
            if (episodeCount > longestShow.episodes) {
              longestShow = {
                title: media.name ?? 'Unknown Show',
                episodes: episodeCount
              };
            }
            totalEpisodes += episodeCount;
          }

          // Process runtime and watch time
          const entry = watchedEntries[index];
          const watchTimestamp = new Date(entry.updatedAt).getTime();
          const watchDate = new Date(entry.updatedAt).toISOString().slice(0, 10); // YYYY-MM-DD
          const monthKey = new Date(entry.updatedAt).toISOString().slice(0, 7);

          const runtime = selectedMediaType === 'movie' ? 
            (media.runtime || 0) : 
            ((media.episode_run_time?.[0] || 0) * (media.number_of_episodes || 0));

          totalRuntime += runtime;
          if (monthKey in watchTimeByMonth) {
            watchTimeByMonth[monthKey] += runtime;
          }

          // Process ratings
          if (entry.rating) {
            totalRating += entry.rating;
            ratingCount++;
          }

          // Process binge-watching stats
          if (!bingesByDate[watchDate]) {
            bingesByDate[watchDate] = {
              count: 0,
              totalRuntime: 0,
              entries: []
            };
          }
          
          bingesByDate[watchDate].count++;
          bingesByDate[watchDate].totalRuntime += runtime;
          bingesByDate[watchDate].entries.push({
            timestamp: watchTimestamp,
            runtime
          });

          // Process decade counts
          const decade = new Date(entry.updatedAt).getFullYear().toString().slice(0, 3);
          if (!decadeCounts[decade]) {
            decadeCounts[decade] = 0;
          }
          decadeCounts[decade]++;
        });

        // Calculate binge stats from the grouped data
        Object.values(bingesByDate).forEach(dayStats => {
          // Update most content watched in one day
          if (dayStats.count > mostInOneDay) {
            mostInOneDay = dayStats.count;
          }

          // Calculate longest binge (consecutive watches within 3 hours of each other)
          if (dayStats.entries.length > 1) {
            dayStats.entries.sort((a, b) => a.timestamp - b.timestamp);
            let currentBinge = dayStats.entries[0].runtime;
            let maxBinge = currentBinge;
            
            for (let i = 1; i < dayStats.entries.length; i++) {
              const timeDiff = dayStats.entries[i].timestamp - dayStats.entries[i-1].timestamp;
              if (timeDiff <= 3 * 60 * 60 * 1000) { // 3 hours in milliseconds
                currentBinge += dayStats.entries[i].runtime;
                maxBinge = Math.max(maxBinge, currentBinge);
              } else {
                currentBinge = dayStats.entries[i].runtime;
              }
            }
            
            longestBinge = Math.max(longestBinge, maxBinge);
          }
        });

        // Calculate average session (average runtime per day with activity)
        const totalDays = Object.keys(bingesByDate).length;
        averageSession = totalDays > 0 ? totalRuntime / totalDays : 0;

        // Calculate completion rate
        const totalEntries = watchlist.filter(entry => entry.mediaType === selectedMediaType).length;
        const completionRate = totalEntries > 0 ? (watchedEntries.length / totalEntries) * 100 : 0;

        // Update stats based on media type
        setStats(prevStats => {
          const newStats = {
            ...(prevStats || {
              totalWatched: { movies: 0, shows: 0 },
              totalWatchtime: { movies: 0, shows: 0 },
              averageRating: { movies: 0, shows: 0 },
              topGenres: { movies: [], shows: [] },
              topDirectors: [],
              topShowCreators: [],
              watchingStreak: 0,
              favoriteDecade: {
                movies: { decade: '', count: 0 },
                shows: { decade: '', count: 0 }
              },
              watchTimeByMonth: {
                movies: [],
                shows: []
              },
              completionRate: { movies: 0, shows: 0 },
              averageEpisodesPerShow: 0,
              totalEpisodesWatched: 0,
              longestShow: { title: '', episodes: 0 },
              longestBinge: 0,
              mostInOneDay: 0,
              averageSession: 0,
              decadeCounts: {}
            })
          };
          
          if (selectedMediaType === 'movie') {
            newStats.totalWatched.movies = watchedEntries.length;
            newStats.totalWatchtime.movies = totalRuntime;
            newStats.averageRating.movies = ratingCount > 0 ? totalRating / ratingCount : 0;
            newStats.topGenres.movies = Object.values(genreCounts)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
            newStats.topDirectors = Object.values(creatorCounts)
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
            newStats.completionRate.movies = completionRate;
            newStats.watchTimeByMonth.movies = Object.entries(watchTimeByMonth)
              .map(([month, minutes]) => ({ month, minutes }));
          } else {
            newStats.totalWatched.shows = watchedEntries.length;
            newStats.totalWatchtime.shows = totalRuntime;
            newStats.averageRating.shows = ratingCount > 0 ? totalRating / ratingCount : 0;
            newStats.topGenres.shows = Object.values(genreCounts)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);
            newStats.topShowCreators = Object.values(creatorCounts)
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);
            newStats.completionRate.shows = completionRate;
            newStats.watchTimeByMonth.shows = Object.entries(watchTimeByMonth)
              .map(([month, minutes]) => ({ month, minutes }));
            newStats.averageEpisodesPerShow = totalEpisodes / watchedEntries.length;
            newStats.totalEpisodesWatched = totalEpisodes;
            newStats.longestShow = longestShow;
            newStats.longestBinge = longestBinge;
            newStats.mostInOneDay = mostInOneDay;
            newStats.averageSession = averageSession;
            newStats.decadeCounts = decadeCounts;
          }

          return newStats;
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (watchlist.length > 0) {
      calculateStats();
    }
  }, [userId, watchlist, selectedMediaType]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
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

  if (!stats) return null;

  const currentStats = selectedMediaType === 'movie' ? {
    totalWatched: stats.totalWatched.movies,
    totalWatchtime: stats.totalWatchtime.movies,
    averageRating: stats.averageRating.movies,
    completionRate: stats.completionRate.movies,
    topGenres: stats.topGenres.movies,
    watchTimeByMonth: stats.watchTimeByMonth.movies
  } : {
    totalWatched: stats.totalWatched.shows,
    totalWatchtime: stats.totalWatchtime.shows,
    averageRating: stats.averageRating.shows,
    completionRate: stats.completionRate.shows,
    topGenres: stats.topGenres.shows,
    watchTimeByMonth: stats.watchTimeByMonth.shows
  };

  return (
    <div className="space-y-6">
      {/* Stats Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-white/10">
            {selectedMediaType === 'movie' ? (
              <LuFilm className="w-6 h-6" />
            ) : (
              <LuTv className="w-6 h-6" />
            )}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-medium">
              {selectedMediaType === 'movie' ? 'Movie Statistics' : 'TV Show Statistics'}
            </h3>
            <p className="text-sm text-gray-400">
              {`${currentStats.totalWatched} ${selectedMediaType === 'movie' ? 'movies' : 'shows'} • ${formatTime(currentStats.totalWatchtime)} watched`}
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

            {/* Primary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={selectedMediaType === 'movie' ? 'Movies Watched' : 'Shows Watched'}
                value={currentStats.totalWatched}
                icon={selectedMediaType === 'movie' ? LuFilm : LuTv}
                color="purple"
              />
              <StatCard
                title="Watch Time"
                value={formatTime(currentStats.totalWatchtime)}
                icon={LuClock}
                color="blue"
              />
              <StatCard
                title="Average Rating"
                value={currentStats.averageRating.toFixed(1)}
                icon={LuStar}
                color="yellow"
              />
              <StatCard
                title="Completion Rate"
                value={`${Math.round(currentStats.completionRate)}%`}
                icon={LuTrendingUp}
                color="green"
              />
            </div>

            {/* Favorite Decades */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-4">Time Machine</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {Object.entries(stats.decadeCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([decade, count], index) => (
                  <motion.div
                    key={decade}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 backdrop-blur-lg rounded-lg p-4 text-center border border-white/10"
                  >
                    <div className="text-2xl font-bold">{decade}s</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {count} {count === 1 ? 
                        (selectedMediaType === 'movie' ? 'movie' : 'show') : 
                        (selectedMediaType === 'movie' ? 'movies' : 'shows')}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {Math.round((count / currentStats.totalWatched) * 100)}% of library
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Favorite Directors/Creators */}
            {(selectedMediaType === 'movie' ? stats.topDirectors : stats.topShowCreators).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
              >
                <h3 className="text-xl font-semibold mb-4">
                  {selectedMediaType === 'movie' ? 'Favorite Directors' : 'Show Creators'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(selectedMediaType === 'movie' ? stats.topDirectors : stats.topShowCreators).map((creator, index) => (
                    <motion.div
                      key={creator.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 bg-white/5 backdrop-blur-lg rounded-lg p-4 border border-white/10"
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/10">
                        {creator.profilePath ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${creator.profilePath}`}
                            alt={creator.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-white/40">
                            {creator.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{creator.name}</div>
                        <div className="text-sm text-gray-400">
                          {creator.count} {creator.count === 1 ? 
                            (selectedMediaType === 'movie' ? 'movie' : 'show') : 
                            (selectedMediaType === 'movie' ? 'movies' : 'shows')}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Genre Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-4">Genre Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {currentStats.topGenres.map((genre, index) => (
                  <motion.div
                    key={genre.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 backdrop-blur-lg rounded-lg p-4 text-center border border-white/10"
                  >
                    <div className="text-lg font-medium">{genre.name}</div>
                    <div className="text-sm text-gray-400">
                      {genre.count} {genre.count === 1 ? 
                        (selectedMediaType === 'movie' ? 'movie' : 'show') : 
                        (selectedMediaType === 'movie' ? 'movies' : 'shows')}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {Math.round((genre.count / currentStats.totalWatched) * 100)}% of total
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Fun Stats & Superlatives */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Binge-Watching Stats */}
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold mb-4">Binge-Watching Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Longest Binge</span>
                    <span className="font-medium">{formatTime(stats.longestBinge || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Most in One Day</span>
                    <span className="font-medium">
                      {stats.mostInOneDay || 0} {selectedMediaType === 'movie' ? 'movies' : 'episodes'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Average Session</span>
                    <span className="font-medium">{formatTime(stats.averageSession || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Fun Facts */}
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold mb-4">Fun Facts</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Could have flown to Mars</span>
                    <span className="font-medium">
                      {Math.round((currentStats.totalWatchtime / (34560000)) * 100)}% of the way
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Could have learned</span>
                    <span className="font-medium">
                      {Math.floor(currentStats.totalWatchtime / 480)} new languages
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Equivalent to</span>
                    <span className="font-medium">
                      {Math.round(currentStats.totalWatchtime / 1440)} days of content
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* TV Show Specific Stats */}
            {selectedMediaType === 'tv' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <StatCard
                  title="Total Episodes"
                  value={stats.totalEpisodesWatched}
                  icon={LuTv}
                  color="purple"
                />
                <StatCard
                  title="Avg Episodes per Show"
                  value={Math.round(stats.averageEpisodesPerShow)}
                  icon={LuActivity}
                  color="blue"
                />
                <StatCard
                  title="Longest Show"
                  value={stats.longestShow.episodes}
                  subtitle={stats.longestShow.title}
                  icon={LuTrendingUp}
                  color="green"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 