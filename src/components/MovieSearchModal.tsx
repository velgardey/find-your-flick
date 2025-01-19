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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-black rounded-2xl p-6 w-full max-w-xl border border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white font-sol">Search Movies</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        
        <input
            className="w-full p-3 bg-gray-900 text-white rounded-xl mb-4 placeholder:text-gray-700"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a movie..."
        />

        {isLoading && <div className="text-gray-400 text-center">Loading...</div>}

        <div className="max-h-[60vh] overflow-y-auto">
          {suggestions.map((movie) => (
            <div
              key={movie.id}
              onClick={() => {
                onSelectMovie(movie);
                onClose();
              }}
              className="flex items-center gap-4 p-2 hover:bg-gray-700 rounded-lg cursor-pointer"
            >
              {movie.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                  alt={movie.title}
                  width= {80}
                  height={40}
                  className="rounded"
                />
              )}
              <span className="text-white font-sol">{movie.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}