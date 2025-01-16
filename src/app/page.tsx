'use client';

import { useState } from 'react';
import { LuArrowBigRightDash, LuPlus, LuX } from "react-icons/lu";
import MovieSearchModal from '@/components/MovieSearchModal';
import Image from 'next/image';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovies((prev) => [...prev, movie]);
  };

  const handleRemoveMovie = (movieId: number) => {
    setSelectedMovies((prev) => prev.filter(movie => movie.id !== movieId));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <h1 className="text-6xl text-center font-bold text-white mb-12 mt-[15vh] font-sol">
        Find Your Next Flick
      </h1>
      <div className="w-[60vw] max-w-2xl mt-[10vh] flex flex-col gap-4">
        <div className="flex gap-4 items-start">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-black hover:bg-white hover:text-black text-white p-4 rounded-2xl flex items-center gap-2 mt-2"
          >
            <LuPlus />
          </button>
          <textarea
            className="w-full h-[10vh] p-4 bg-gray-800 text-white rounded-2xl resize-none placeholder:text-gray-700 placeholder:font-sol"
            placeholder="Enter description of your next flick ..."
          />
          <button className="bg-black hover:bg-white hover:text-black transition-colors p-4 rounded-full aspect-auto flex items-center justify-center border border-black mt-2">
            <LuArrowBigRightDash />
          </button>
        </div>

        {selectedMovies.length > 0 && (
          <div className="flex gap-4 flex-wrap mt-4">
            {selectedMovies.map((movie) => (
              <div key={movie.id} className="relative group">
                <Image
                  src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                  alt={movie.title}
                  width={77}
                  height={116}
                  className="rounded-lg"
                />
                <button
                  onClick={() => handleRemoveMovie(movie.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <LuX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MovieSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectMovie={handleSelectMovie}
      />
    </div>
  );
}