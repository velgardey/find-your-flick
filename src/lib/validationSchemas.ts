import { z } from 'zod';
import { WatchStatus } from './prismaTypes';

export const watchlistUpdateSchema = z.object({
  status: z.nativeEnum(WatchStatus).optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const watchlistCreateSchema = z.object({
  movieId: z.number(),
  title: z.string().min(1),
  posterPath: z.string().nullable(),
  status: z.nativeEnum(WatchStatus),
}); 