"use client";

import { useState } from "react";
import { LuArrowBigRightDash, LuPlus, LuX } from "react-icons/lu";
import MovieSearchModal from "@/components/MovieSearchModal";
import MovieRecommendations from "@/components/MovieRecommendations";
import { generateMovieRecommendations } from "@/services/gemmaService";
import Image from "next/image";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [description, setDescription] = useState("");
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovies((prev) => [...prev, movie]);
  };

  const handleRemoveMovie = (movieId: number) => {
    setSelectedMovies((prev) => prev.filter((movie) => movie.id !== movieId));
  };

  const handleGenerateRecommendations = async () => {
    if (!description && selectedMovies.length === 0) return;

    setIsLoading(true);
    try {
      const movieTitles = await generateMovieRecommendations(
        description,
        selectedMovies
      );

      if (!movieTitles || movieTitles.length === 0) {
        throw new Error("No recommendations received");
      }

      const moviePromises = movieTitles.map(async (title: string) => {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${
              process.env.NEXT_PUBLIC_TMDB_API_KEY
            }&query=${encodeURIComponent(title)}`
          );
          if (!response.ok) {
            throw new Error(
              `TMDB API request failed with status ${response.status}`
            );
          }
          const data = await response.json();
          return data.results[0] || null;
        } catch (error) {
          console.error(`Error searching for movie "${title}":`, error);
          return null;
        }
      });

      const movies = await Promise.all(moviePromises);
      const validMovies = movies.filter(
        (movie): movie is Movie => movie !== null
      );
      setRecommendations(validMovies);
    } catch (error) {
      console.error("Error generating recommendations:", error);
    } finally {
      setIsLoading(false);
    }
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-[10vh] p-4 bg-gray-800 text-white rounded-2xl resize-none placeholder:text-gray-700 placeholder:font-sol"
            placeholder="Enter description of your next flick ..."
          />
          <button
            onClick={handleGenerateRecommendations}
            className="bg-black hover:bg-white hover:text-black transition-colors p-4 rounded-full aspect-auto flex items-center justify-center border border-black mt-2"
          >
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

      <MovieRecommendations
        recommendations={recommendations}
        isLoading={isLoading}
        description={description}
        selectedMovies={selectedMovies}
        setRecommendations={setRecommendations}
      />

      <MovieSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectMovie={handleSelectMovie}
      />
    </div>
  );
}
