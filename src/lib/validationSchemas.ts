import { z } from 'zod';
import { WatchStatus } from './prismaTypes';

export const watchlistUpdateSchema = z.object({
  status: z.nativeEnum(WatchStatus).optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  genres: z.array(z.string()).optional(),
  // TV show specific fields
  currentSeason: z.number().int().min(0).nullable().optional(),
  currentEpisode: z.number().int().min(0).nullable().optional(),
  totalSeasons: z.number().int().min(0).nullable().optional(),
  totalEpisodes: z.number().int().min(0).nullable().optional(),
  nextAirDate: z.string().nullable().optional(),
  showStatus: z.string().nullable().optional(),
});

export const watchlistCreateSchema = z.object({
  mediaId: z.number(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  posterPath: z.string().nullable(),
  status: z.nativeEnum(WatchStatus),
  genres: z.array(z.string()),
  // TV show specific fields
  currentSeason: z.number().int().min(0).nullable().optional(),
  currentEpisode: z.number().int().min(0).nullable().optional(),
  totalSeasons: z.number().int().min(0).nullable().optional(),
  totalEpisodes: z.number().int().min(0).nullable().optional(),
  nextAirDate: z.string().nullable().optional(),
  showStatus: z.string().nullable().optional(),
});