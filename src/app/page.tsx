"use client";

import { useState } from "react";
import { LuArrowBigRightDash, LuPlus, LuX, LuInfo } from "react-icons/lu";
import MediaSearchModal from "@/components/MediaSearchModal";
import MediaRecommendations from "@/components/MediaRecommendations";
import { generateMediaRecommendations } from "@/services/gemmaService";
import Image from "next/image";
import MouseGlow from "@/components/MouseGlow";
import MediaDetailsModal from "@/components/MediaDetailsModal";

interface Media {
  id: number;
  title: string;  // movie.title or tvShow.name
  poster_path: string;
  media_type: 'movie' | 'tv';
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
  const [description, setDescription] = useState("");
  const [recommendations, setRecommendations] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backdropMediaId, setBackdropMediaId] = useState<number | null>(null);
  const [backdropMediaType, setBackdropMediaType] = useState<'movie' | 'tv'>('movie');
  const [showMediaDetails, setShowMediaDetails] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [selectedMediaType] = useState<'movie' | 'tv'>('movie');
  const [showMediaSearch, setShowMediaSearch] = useState(false);
  const [showMaxMediaError, setShowMaxMediaError] = useState(false);

  const handleRemoveMedia = (mediaId: number) => {
    setSelectedMedia((prev) => prev.filter((media) => media.id !== mediaId));
  };

  const handleGenerateRecommendations = async () => {
    if (!description && selectedMedia.length === 0) {
      setError("Please enter a description or select some titles");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Use the media type of the last selected item, or default to 'movie'
      const preferredMediaType = selectedMedia.length > 0 
        ? selectedMedia[selectedMedia.length - 1].media_type 
        : 'movie';

      const mediaTitles = await generateMediaRecommendations(
        description,
        selectedMedia,
        15,
        preferredMediaType
      );

      if (!mediaTitles || mediaTitles.length === 0) {
        throw new Error("No recommendations received");
      }

      const mediaPromises = mediaTitles.map(async (title: string) => {
        try {
          // Search both movies and TV shows
          const [movieResponse, tvResponse] = await Promise.all([
            fetch(
              `https://api.themoviedb.org/3/search/movie?api_key=${
                process.env.NEXT_PUBLIC_TMDB_API_KEY
              }&query=${encodeURIComponent(title)}`
            ),
            fetch(
              `https://api.themoviedb.org/3/search/tv?api_key=${
                process.env.NEXT_PUBLIC_TMDB_API_KEY
              }&query=${encodeURIComponent(title)}`
            )
          ]);

          if (!movieResponse.ok && !tvResponse.ok) {
            throw new Error(
              `TMDB API requests failed with status ${movieResponse.status} and ${tvResponse.status}`
            );
          }

          const [movieData, tvData] = await Promise.all([
            movieResponse.json(),
            tvResponse.json()
          ]);

          // Get the best match from either movies or TV shows
          const movieResult = movieData.results[0];
          const tvResult = tvData.results[0];

          if (!movieResult && !tvResult) return null;

          // If we have a preferred media type, prioritize that type's result
          if (preferredMediaType === 'movie' && movieResult) {
            return { ...movieResult, media_type: 'movie' };
          }
          if (preferredMediaType === 'tv' && tvResult) {
            return { ...tvResult, media_type: 'tv', title: tvResult.name };
          }

          // Otherwise, choose the result with higher popularity
          if (!movieResult) return { ...tvResult, media_type: 'tv', title: tvResult.name };
          if (!tvResult) return { ...movieResult, media_type: 'movie' };

          return movieResult.popularity > tvResult.popularity
            ? { ...movieResult, media_type: 'movie' }
            : { ...tvResult, media_type: 'tv', title: tvResult.name };

        } catch (error) {
          console.error(`Error searching for media "${title}":`, error);
          return null;
        }
      });

      const mediaResults = await Promise.all(mediaPromises);
      const validMedia = mediaResults.filter(
        (media): media is Media => media !== null
      );

      if (validMedia.length === 0) {
        throw new Error("Could not find any matching movies or TV shows");
      }

      setRecommendations(validMedia);
      setError(null);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      setError(error instanceof Error ? error.message : "Failed to generate recommendations");
      setRecommendations([]);
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

  const handleSelectMediaFromSearch = (media: { id: number; title: string; poster_path: string; media_type: 'movie' | 'tv' }) => {
    if (selectedMedia.length >= 3) {
      setShowMaxMediaError(true);
      return;
    }
    setSelectedMedia([...selectedMedia, media]);
    setShowMediaSearch(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <MouseGlow onMediaChange={(mediaId, mediaType) => {
        setBackdropMediaId(mediaId);
        setBackdropMediaType(mediaType);
      }} />
      
      <div className="w-full pt-[12vh] sm:pt-[15vh] pb-6 sm:pb-8">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl md:text-6xl text-center font-bold text-white mb-6 sm:mb-8 font-sol select-none">
            Find Your Next Flick
          </h1>
          
          <div className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {showMaxMediaError && (
              <div className="bg-yellow-500/10 text-yellow-400 px-4 py-3 rounded-xl text-sm">
                You can only select up to 3 titles at a time
              </div>
            )}

            <div className="flex gap-2 sm:gap-4 items-start">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-black/50 backdrop-blur-sm hover:bg-white/10 active:bg-white/20 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-center touch-manipulation"
                aria-label="Add movie or TV show"
              >
                <LuPlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what kind of movie or TV show you're looking for..."
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
        {selectedMedia.length > 0 && (
          <div className="max-w-xl mx-auto">
            <div className="flex gap-2 sm:gap-4 flex-wrap mt-2 sm:mt-4">
              {selectedMedia.map((media) => (
                <div key={media.id} className="relative group touch-manipulation">
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                  <div className="relative aspect-[2/3] w-[60px] sm:w-[80px] rounded-lg overflow-hidden">
                    {media.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${media.poster_path}`}
                        alt={media.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-400 text-xs text-center px-2">No poster</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveMedia(media.id)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <LuX className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <MediaRecommendations
          recommendations={recommendations}
          isLoading={isLoading}
          selectedMedia={selectedMedia}
          onClearSelection={() => setSelectedMedia([])}
        />
      </div>

      <button
        onClick={() => setShowMediaDetails(true)}
        className="fixed bottom-4 right-4 bg-black/50 backdrop-blur-sm hover:bg-white/10 active:bg-white/20 text-white p-3 rounded-full z-50 transition-all duration-200 hover:scale-110"
        aria-label="Show backdrop media details"
      >
        <LuInfo className="w-5 h-5" />
      </button>

      <MediaSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectMedia={handleSelectMediaFromSearch}
        initialMediaType={selectedMedia.length > 0 ? selectedMedia[selectedMedia.length - 1].media_type : 'movie'}
      />

      {showMediaDetails && backdropMediaId && (
        <MediaDetailsModal
          mediaId={backdropMediaId}
          mediaType={backdropMediaType}
          onClose={() => setShowMediaDetails(false)}
        />
      )}

      <MediaDetailsModal
        mediaId={selectedMediaId}
        mediaType={selectedMediaType}
        onClose={() => setSelectedMediaId(null)}
      />

      <MediaSearchModal
        isOpen={showMediaSearch}
        onClose={() => setShowMediaSearch(false)}
        onSelectMedia={handleSelectMediaFromSearch}
        initialMediaType={selectedMedia.length > 0 ? selectedMedia[selectedMedia.length - 1].media_type : 'movie'}
      />
    </div>
  );
}
