'use client'
import { useState, useEffect } from 'react';
import MediaDetailsModal from '@/components/MediaDetailsModal';
import WatchlistButton from './WatchlistButton';
import RetryImage from './ui/RetryImage';

interface Media {
  id: number;
  title: string;
  poster_path: string;
  media_type: 'movie' | 'tv';
}

interface MediaRecommendationsProps {
  recommendations: Media[];
  isLoading: boolean;
  selectedMedia: Media[];
  onClearSelection: () => void;
}

export default function MediaRecommendations({
  recommendations,
  isLoading,
  selectedMedia,
  onClearSelection,
}: MediaRecommendationsProps) {
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv'>('movie');

  useEffect(() => {
    setSelectedMediaId(null);
  }, [recommendations]);

  const handleClearSelection = () => {
    onClearSelection();
  };

  const handleMediaClick = (mediaId: number, mediaType: 'movie' | 'tv', event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedMediaId(mediaId);
    setSelectedMediaType(mediaType);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 animate-pulse"
          >
            <div className="aspect-[2/3] bg-white/10" />
            <div className="p-4">
              <div className="h-6 bg-white/10 rounded mb-2" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations.length) return null;

  return (
    <div className="relative">
      {selectedMedia.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm text-gray-400">
            Selected: {selectedMedia.map(media => media.title).join(', ')}
          </p>
          <button
            onClick={handleClearSelection}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 mt-8">
        {recommendations.map((media) => (
          <div
            key={media.id}
            onClick={(e) => handleMediaClick(media.id, media.media_type, e)}
            className="media-card bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 touch-manipulation cursor-pointer"
          >
            <div 
              className="relative aspect-[2/3] transition-transform active:scale-[0.98] hover:scale-[1.03] duration-200"
            >
              {media.poster_path ? (
                <>
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                  <RetryImage
                    src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
                    alt={media.title}
                    className="object-cover rounded-t-xl"
                    sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 250px"
                    quality={85}
                    priority
                    maxRetries={5}
                    retryDelay={1500}
                    fallbackText="Image not available"
                    fill
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-gray-800 rounded-t-xl flex items-center justify-center">
                  <span className="text-gray-400 text-sm text-center px-4">No poster available</span>
                </div>
              )}
            </div>
            <div className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <h3 className="text-base sm:text-lg font-semibold flex-1 line-clamp-2">{media.title}</h3>
              </div>
              <div className="mt-3 sm:mt-4" onClick={(e) => e.stopPropagation()}>
                <WatchlistButton
                  media={media}
                  position="bottom"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <MediaDetailsModal
        mediaId={selectedMediaId}
        mediaType={selectedMediaType}
        onClose={() => setSelectedMediaId(null)}
      />
    </div>
  );
} 