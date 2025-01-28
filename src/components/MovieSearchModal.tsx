'use client'
import { useState, useEffect, useCallback } from 'react';
import RetryImage from './ui/RetryImage';
import { motion, AnimatePresence } from 'framer-motion';
import WatchlistButton from './WatchlistButton';
import MovieDetailsModal from './MovieDetailsModal';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface MovieSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export default function MovieSearchModal({ isOpen, onClose, onSelectMovie }: MovieSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);

  const searchMovies = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const response = await fetch(
        `/api/tmdb?path=/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to search movies');
      }

      const data = await response.json();
      setSuggestions(data.results || []);
    } catch (error) {
      console.error('Error searching movies:', error);
      setSuggestions([]);
      if (error instanceof Error) {
        setError(error.name === 'AbortError' ? 'Search cancelled' : error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => searchMovies(searchQuery), 300);
    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [searchQuery, searchMovies]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSuggestions([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleMovieClick = (movieId: number) => {
    setSelectedMovieId(movieId);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full max-h-[85vh] sm:max-w-2xl bg-gradient-to-br from-white/[0.15] to-white/[0.05] backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 sticky top-0 z-[150] bg-inherit backdrop-blur-xl rounded-t-2xl border-b border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Search Movies</h2>
            <motion.button 
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
            >
              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
          
          {/* Search Input */}
          <div className="p-4 border-b border-white/10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <input
                className="w-full p-4 bg-black/40 text-white text-lg rounded-xl placeholder:text-gray-500 backdrop-blur-sm border border-white/20 focus:border-white/30 transition-colors outline-none"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a movie..."
                autoFocus
              />
            </motion.div>
          </div>

          {/* Results Container */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Loading State */}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center items-center py-8"
              >
                <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              </motion.div>
            )}

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="m-4 bg-red-500/10 text-red-400 p-4 rounded-xl text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Results */}
            <motion.div
              initial={false}
              animate={{ height: suggestions.length ? 'auto' : 0 }}
              className="p-4 space-y-4"
            >
              {suggestions.map((movie) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <motion.div
                    className="flex flex-row gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    layoutId={`movie-${movie.id}`}
                  >
                    {/* Poster */}
                    <motion.div
                      className="relative w-[80px] sm:w-[100px] aspect-[2/3] shrink-0 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => handleMovieClick(movie.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      layoutId={`poster-${movie.id}`}
                    >
                      {movie.poster_path ? (
                        <RetryImage
                          src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                          alt={movie.title}
                          className="object-cover"
                          fill
                          sizes="(max-width: 640px) 80px, 100px"
                          quality={85}
                          priority={false}
                          maxRetries={3}
                          retryDelay={1000}
                          fallbackText="No Image"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10">
                          <span className="text-gray-500 text-sm text-center px-2">No Image</span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 sm:opacity-100"
                      >
                        <span className="text-white text-sm font-medium">View Details</span>
                      </motion.div>
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <motion.h3
                        className="text-lg font-medium text-white truncate"
                        layoutId={`title-${movie.id}`}
                      >
                        {movie.title}
                      </motion.h3>
                      
                      <div className="flex flex-col gap-2">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <WatchlistButton movie={movie} />
                        </motion.div>
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            onSelectMovie(movie);
                            onClose();
                          }}
                          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 backdrop-blur-sm rounded-xl text-white font-medium transition-all border border-white/10 shadow-lg flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 4v16m-8-8h16" />
                          </svg>
                          <span>Attach</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Movie Details Modal */}
        <AnimatePresence>
          {selectedMovieId && (
            <motion.div 
              className="fixed inset-0 z-[200]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedMovieId(null)}
              />
              <MovieDetailsModal
                movieId={selectedMovieId}
                onClose={() => setSelectedMovieId(null)}
                layoutId={`poster-${selectedMovieId}`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}