import { WatchStatus } from '@/lib/prismaTypes';

export type MediaType = 'movie' | 'tv';

interface BaseMedia {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  tagline: string;
  original_language: string;
  genres: { id: number; name: string }[];
  media_type: MediaType;
}

export interface MovieDetails extends BaseMedia {
  media_type: 'movie';
  runtime?: number;
  release_date?: string;
  production_companies?: { id: number; name: string; logo_path?: string }[];
  budget?: number;
  revenue?: number;
  status?: string;
}

export interface TVShowDetails extends BaseMedia {
  media_type: 'tv';
  name: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  first_air_date?: string;
  last_air_date?: string;
  next_episode_to_air?: {
    air_date: string;
    episode_number: number;
    season_number: number;
    name: string;
  };
  status?: string;
  in_production?: boolean;
  networks?: { id: number; name: string; logo_path?: string }[];
  seasons?: {
    id: number;
    name: string;
    episode_count: number;
    season_number: number;
    air_date?: string;
    poster_path?: string;
    overview?: string;
  }[];
}

export type MediaDetails = MovieDetails | TVShowDetails;

export interface Media {
  id: number;
  title: string;
  poster_path: string;
  media_type: MediaType;
}

export interface WatchlistEntry {
  id: string;
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  status: WatchStatus;
  rating: number | null;
  notes: string | null;
  // TV show specific fields
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  nextAirDate?: string;
  showStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  provider_name: string;
  logo_path: string;
  provider_id: number;
}

export interface StreamingData {
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
}

export interface MediaVideo {
  key: string;
  site: string;
  type: string;
  name: string;
} 