"use client";

import { useState } from "react";
import { LuArrowBigRightDash, LuPlus, LuX, LuInfo } from "react-icons/lu";
import MovieSearchModal from "@/components/MovieSearchModal";
import MovieRecommendations from "@/components/MovieRecommendations";
import { generateMediaRecommendations } from "@/services/gemmaService";
import Image from "next/image";
import MouseGlow from "@/components/MouseGlow";
import MovieDetailsModal from "@/components/MovieDetailsModal";

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
  const [backdropMovieId, setBackdropMovieId] = useState<number | null>(null);
  const [showMovieDetails, setShowMovieDetails] = useState(false);

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
      const movieTitles = await generateMediaRecommendations(
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateRecommendations();
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <MouseGlow onMovieChange={setBackdropMovieId} />
      
      <div className="w-full pt-[12vh] sm:pt-[15vh] pb-6 sm:pb-8">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl md:text-6xl text-center font-bold text-white mb-6 sm:mb-8 font-sol">
            Find Your Next Flick
          </h1>
          
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 sm:gap-4 items-start">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-black/50 backdrop-blur-sm hover:bg-white/10 active:bg-white/20 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-center touch-manipulation"
                aria-label="Add movie"
              >
                <LuPlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what kind of movie you're looking for..."
                className="flex-1 bg-black/50 backdrop-blur-sm text-white placeholder:text-gray-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-800/50 min-h-[60px] resize-none hide-scrollbar shine-border text-sm sm:text-base"
              />
              <button
                onClick={handleGenerateRecommendations}
                className="bg-black/50 backdrop-blur-sm hover:bg-white/10 active:bg-white/20 transition-colors p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-center border border-gray-800/50 touch-manipulation"
                aria-label="Generate recommendations"
              >
                <LuArrowBigRightDash className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 flex-1">
        {selectedMovies.length > 0 && (
          <div className="max-w-xl mx-auto">
            <div className="flex gap-2 sm:gap-4 flex-wrap mt-2 sm:mt-4">
              {selectedMovies.map((movie) => (
                <div key={movie.id} className="relative group touch-manipulation">
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                  <Image
                    src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                    alt={movie.title}
                    width={50}
                    height={75}
                    className="rounded-lg sm:w-[77px] sm:h-[116px] object-cover transition-opacity duration-300"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                  <button
                    onClick={() => handleRemoveMovie(movie.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 active:opacity-100 transition-opacity touch-manipulation"
                    aria-label={`Remove ${movie.title}`}
                  >
                    <LuX className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <MovieRecommendations
            recommendations={recommendations}
            isLoading={isLoading}
            description={description}
            selectedMovies={selectedMovies}
            setRecommendations={setRecommendations}
          />
        </div>
      </div>

      <button
        onClick={() => setShowMovieDetails(true)}
        className="fixed bottom-4 right-4 bg-black/50 backdrop-blur-sm hover:bg-white/10 active:bg-white/20 text-white p-3 rounded-full z-50 transition-all duration-200 hover:scale-110"
        aria-label="Show backdrop movie details"
      >
        <LuInfo className="w-5 h-5" />
      </button>

      <MovieSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectMovie={handleSelectMovie}
      />

      {showMovieDetails && backdropMovieId && (
        <MovieDetailsModal
          movieId={backdropMovieId}
          onClose={() => setShowMovieDetails(false)}
        />
      )}
    </div>
  );
}
