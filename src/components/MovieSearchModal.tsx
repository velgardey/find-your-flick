import { useState, useEffect } from 'react';
import Image from 'next/image';

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

  useEffect(() => {
    const searchMovies = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`
        );
        const data = await response.json();
        setSuggestions(data.results);
      } catch (error) {
        console.error('Error searching movies:', error);
      }
      setIsLoading(false);
    };

    const debounceTimeout = setTimeout(searchMovies, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 z-[100] overflow-y-auto">
      <div className="bg-gradient-to-br from-white/[0.15] to-white/[0.05] backdrop-blur-2xl rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-xl border border-white/20 mt-16 sm:mt-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.12] before:to-transparent before:pointer-events-none relative">
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

        <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
          {suggestions.map((movie) => (
            <div
              key={movie.id}
              onClick={() => {
                onSelectMovie(movie);
                onClose();
              }}
              className="flex items-center gap-4 p-3 hover:bg-white/10 active:bg-white/20 rounded-lg cursor-pointer transition-all group"
            >
              {movie.poster_path ? (
                <div className="relative">
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    alt={movie.title}
                    width={60}
                    height={90}
                    className="rounded-lg object-cover transition-transform group-hover:scale-105"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVigAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        target.style.display = 'none';
                        parent.classList.add('bg-black/30', 'backdrop-blur-sm', 'border', 'border-white/10');
                        parent.innerHTML = '<span class="text-gray-500 text-sm">No Image</span>';
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-[60px] h-[90px] bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10">
                  <span className="text-gray-500 text-sm">No Image</span>
                </div>
              )}
              <span className="text-white flex-1 group-hover:translate-x-1 transition-transform">{movie.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}