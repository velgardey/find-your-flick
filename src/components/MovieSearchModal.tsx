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
  const [touchedMovieId, setTouchedMovieId] = useState<string | null>(null);

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

  const handlePosterTouch = (movieId: string, event: React.MouseEvent) => {
    if (window.matchMedia('(hover: hover)').matches) return;
    
    event.preventDefault();
    event.stopPropagation();
    setTouchedMovieId(touchedMovieId === movieId ? null : movieId);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 z-[100] overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gradient-to-br from-white/[0.15] to-white/[0.05] backdrop-blur-2xl rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-xl border border-white/20 mt-16 sm:mt-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.12] before:to-transparent before:pointer-events-none relative"
        >
          <div className="flex justify-between items-center mb-4 relative z-[150]">
            <h2 className="text-lg sm:text-xl font-bold text-white">Search Movies</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <input
            className="w-full p-3 sm:p-4 bg-black/40 text-white rounded-xl mb-4 placeholder:text-gray-500 backdrop-blur-sm border border-white/20 focus:border-white/30 transition-colors outline-none"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a movie..."
            autoFocus
          />

          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm text-center py-4">
              {error}
            </div>
          )}

          <motion.div
            initial={false}
            animate={{ height: suggestions.length ? 'auto' : 0 }}
            className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto"
          >
            {suggestions.map((movie) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-3 rounded-lg transition-all group"
              >
                <motion.div
                  className={`relative w-[60px] h-[90px] rounded-lg overflow-hidden cursor-pointer transition-transform ${
                    !window.matchMedia('(hover: hover)').matches && touchedMovieId !== `${movie.id}` 
                      ? '' 
                      : 'hover:scale-105'
                  }`}
                  onClick={(e) => {
                    if (!window.matchMedia('(hover: hover)').matches) {
                      handlePosterTouch(`${movie.id}`, e);
                    } else {
                      handleMovieClick(movie.id);
                    }
                  }}
                  whileHover={window.matchMedia('(hover: hover)').matches ? { scale: 1.05 } : undefined}
                  whileTap={{ scale: 0.95 }}
                >
                  {movie.poster_path ? (
                    <RetryImage
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      alt={movie.title}
                      className="object-cover"
                      fill
                      sizes="60px"
                      quality={85}
                      priority={false}
                      maxRetries={3}
                      retryDelay={1000}
                      fallbackText="No Image"
                    />
                  ) : (
                    <div className="w-[60px] h-[90px] bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10">
                      <span className="text-gray-500 text-sm text-center px-2">No Image</span>
                    </div>
                  )}
                  {!window.matchMedia('(hover: hover)').matches && touchedMovieId === `${movie.id}` && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center"
                      onClick={() => handleMovieClick(movie.id)}
                    >
                      <span className="text-white text-xs">View Details</span>
                    </motion.div>
                  )}
                </motion.div>
                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-white group-hover:translate-x-1 transition-transform">{movie.title}</span>
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="flex-[2]"
                    >
                      <WatchlistButton movie={movie} />
                    </motion.div>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onSelectMovie(movie);
                        onClose();
                      }}
                      className="flex-1 px-3 py-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 active:from-blue-500/40 active:to-purple-500/40 backdrop-blur-sm rounded-lg text-white/90 text-sm font-medium transition-all border border-white/10 shadow-lg touch-manipulation hover:shadow-xl hover:border-white/20 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 4v16m-8-8h16" />
                      </svg>
                      <span>Attach</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Movie Details Modal */}
        {selectedMovieId && (
          <MovieDetailsModal
            movieId={selectedMovieId}
            onClose={() => setSelectedMovieId(null)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}