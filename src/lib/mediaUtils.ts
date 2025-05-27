import { MovieDetails, TVShowDetails, MediaVideo, StreamingData } from '@/types/media';

/**
 * Fetch media details from TMDB API
 * @param mediaType The type of media ('movie' or 'tv')
 * @param mediaId The ID of the media
 * @param options Additional options for the fetch request
 * @returns The media details
 */
export async function fetchMediaDetails<T = MovieDetails | TVShowDetails>(
  mediaType: 'movie' | 'tv',
  mediaId: string | number,
  options: {
    appendToResponse?: string[];
    signal?: AbortSignal;
    language?: string;
  } = {}
): Promise<T> {
  const { appendToResponse = [], signal, language = 'en-US' } = options;
  
  let url = `/api/tmdb?path=/${mediaType}/${mediaId}?language=${language}`;
  
  if (appendToResponse.length > 0) {
    url += `&append_to_response=${appendToResponse.join(',')}`;
  }
  
  const response = await fetch(url, { signal });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch media details: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Fetch media videos from TMDB API
 * @param mediaType The type of media ('movie' or 'tv')
 * @param mediaId The ID of the media
 * @param options Additional options for the fetch request
 * @returns The media videos
 */
export async function fetchMediaVideos(
  mediaType: 'movie' | 'tv',
  mediaId: string | number,
  options: {
    signal?: AbortSignal;
    language?: string;
  } = {}
): Promise<MediaVideo[]> {
  const { signal, language = 'en-US' } = options;
  
  const url = `/api/tmdb?path=/${mediaType}/${mediaId}/videos?language=${language}`;
  
  const response = await fetch(url, { signal });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch media videos: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results || [];
}

/**
 * Fetch streaming providers for media from TMDB API
 * @param mediaType The type of media ('movie' or 'tv')
 * @param mediaId The ID of the media
 * @param options Additional options for the fetch request
 * @returns The streaming providers
 */
export async function fetchStreamingProviders(
  mediaType: 'movie' | 'tv',
  mediaId: string | number,
  options: {
    signal?: AbortSignal;
    region?: string;
  } = {}
): Promise<StreamingData | null> {
  const { signal, region = 'IN' } = options;
  
  const url = `/api/tmdb?path=/${mediaType}/${mediaId}/watch/providers`;
  
  const response = await fetch(url, { signal });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch streaming providers: ${response.status}`);
  }
  
  const data = await response.json();
  return data.results?.[region] || null;
}
