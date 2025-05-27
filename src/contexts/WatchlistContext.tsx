'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { WatchStatus } from '@/lib/prismaTypes'
import { fetchWithAuth } from '@/lib/api'

export interface WatchlistEntry {
  id: string
  mediaId: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath: string | null
  status: WatchStatus
  rating: number | null
  notes: string | null
  // Progress tracking fields for both movies and TV shows
  watchedSeconds?: number
  totalDuration?: number
  lastWatched?: string
  // TV show specific fields
  currentSeason?: number
  currentEpisode?: number
  totalSeasons?: number
  totalEpisodes?: number
  nextAirDate?: string
  showStatus?: string
  createdAt: string
  updatedAt: string
  genres: string[]
}

interface LoadingStates {
  adding: number[]      // mediaIds that are being added
  updating: string[]    // entryIds that are being updated
  removing: number[]    // mediaIds that are being removed
}

interface WatchlistContextType {
  watchlist: WatchlistEntry[]
  addToWatchlist: (
    media: { id: number; title: string; poster_path: string; media_type: 'movie' | 'tv' }, 
    status: WatchStatus,
    initialProgress?: Partial<WatchlistEntry>
  ) => Promise<void>
  updateWatchlistEntry: (entryId: string, updates: Partial<WatchlistEntry>) => Promise<void>
  removeFromWatchlist: (mediaId: number) => Promise<void>
  isInWatchlist: (mediaId: number) => boolean
  getWatchlistEntry: (mediaId: number) => WatchlistEntry | undefined
  isLoading: boolean
  loadingStates: LoadingStates
  fetchWatchlist: (searchQuery?: string) => Promise<void>
  hasError: boolean
  retryFailedOperation: () => Promise<void>
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  addToWatchlist: async () => {},
  updateWatchlistEntry: async () => {},
  removeFromWatchlist: async () => {},
  isInWatchlist: () => false,
  getWatchlistEntry: () => undefined,
  isLoading: false,
  loadingStates: { adding: [], updating: [], removing: [] },
  fetchWatchlist: async () => {},
  hasError: false,
  retryFailedOperation: async () => {},
})

function isWatchlistEntry(item: unknown): item is WatchlistEntry {
  if (!item || typeof item !== 'object') return false
  
  const entry = item as Record<string, unknown>
  
  // Required fields
  const hasRequiredFields = 
    typeof entry.id === 'string' &&
    typeof entry.mediaId === 'number' &&
    typeof entry.mediaType === 'string' &&
    (entry.mediaType === 'movie' || entry.mediaType === 'tv') &&
    typeof entry.title === 'string' &&
    typeof entry.status === 'string';

  if (!hasRequiredFields) {
    console.log('Missing required fields in watchlist entry:', entry);
    return false;
  }

  // Optional fields with type checking
  const hasValidOptionalFields = 
    (entry.posterPath === null || typeof entry.posterPath === 'string') &&
    (entry.rating === null || typeof entry.rating === 'number') &&
    (entry.notes === null || typeof entry.notes === 'string') &&
    (entry.createdAt === undefined || typeof entry.createdAt === 'string') &&
    (entry.updatedAt === undefined || typeof entry.updatedAt === 'string') &&
    // Progress tracking fields
    (entry.watchedSeconds === undefined || entry.watchedSeconds === null || typeof entry.watchedSeconds === 'number') &&
    (entry.totalDuration === undefined || entry.totalDuration === null || typeof entry.totalDuration === 'number') &&
    (entry.lastWatched === undefined || entry.lastWatched === null || typeof entry.lastWatched === 'string') &&
    // TV show specific fields
    (entry.currentSeason === undefined || entry.currentSeason === null || typeof entry.currentSeason === 'number') &&
    (entry.currentEpisode === undefined || entry.currentEpisode === null || typeof entry.currentEpisode === 'number') &&
    (entry.totalSeasons === undefined || entry.totalSeasons === null || typeof entry.totalSeasons === 'number') &&
    (entry.totalEpisodes === undefined || entry.totalEpisodes === null || typeof entry.totalEpisodes === 'number') &&
    (entry.nextAirDate === undefined || entry.nextAirDate === null || typeof entry.nextAirDate === 'string') &&
    (entry.showStatus === undefined || entry.showStatus === null || typeof entry.showStatus === 'string') &&
    (entry.genres === undefined || (Array.isArray(entry.genres) && entry.genres.every(g => typeof g === 'string')));

  if (!hasValidOptionalFields) {
    console.log('Invalid optional fields in watchlist entry:', entry);
    return false;
  }

  return true;
}

function isWatchlistArray(data: unknown): data is WatchlistEntry[] {
  if (!Array.isArray(data)) {
    console.log('Expected array but got:', typeof data);
    return false;
  }
  
  const isValid = data.every((item, index) => {
    const valid = isWatchlistEntry(item);
    if (!valid) {
      console.log(`Invalid entry at index ${index}:`, item);
    }
    return valid;
  });

  return isValid;
}

interface WatchlistResponse {
  data: WatchlistEntry[]
}

function isWatchlistResponse(data: unknown): data is WatchlistResponse {
  if (!data || typeof data !== 'object') {
    console.log('Response is not an object:', data);
    return false;
  }
  
  // Handle direct array response
  if (Array.isArray(data)) {
    return isWatchlistArray(data);
  }
  
  // Handle response wrapped in data property
  const response = data as Record<string, unknown>;
  
  if (!('data' in response)) {
    console.log('Response missing data property:', response);
    return false;
  }
  
  if (!Array.isArray(response.data)) {
    console.log('Response data is not an array:', response.data);
    return false;
  }
  
  return isWatchlistArray(response.data);
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    adding: [],
    updating: [],
    removing: [],
  })
  const [hasError, setHasError] = useState(false)
  const [lastFailedOperation, setLastFailedOperation] = useState<(() => Promise<void>) | null>(null)

  const fetchWatchlist = useCallback(async (searchQuery?: string) => {
    if (!user) {
      setWatchlist([])
      setIsLoading(false)
      return
    }

    try {
      const url = searchQuery 
        ? `/api/watchlist?search=${encodeURIComponent(searchQuery)}`
        : '/api/watchlist'
        
      console.log('Fetching watchlist from:', url)
      const response = await fetchWithAuth(url)
      console.log('Raw watchlist response:', response)
      
      // Check if response is null or undefined
      if (!response) {
        console.error('Watchlist response is null or undefined')
        setWatchlist([])
        return
      }

      // Check if response has the correct structure
      if (typeof response !== 'object') {
        console.error('Watchlist response is not an object:', response)
        setWatchlist([])
        return
      }

      // Extract data from response
      const responseData = 'data' in response ? response.data : response
      console.log('Extracted watchlist data:', responseData)
      
      // Validate and transform the data
      if (!isWatchlistResponse(responseData)) {
        console.error('Invalid watchlist data received:', responseData)
        setWatchlist([])
        return
      }
      
      // Handle both direct array and wrapped response
      const watchlistData = Array.isArray(responseData) ? responseData : responseData.data
      console.log('Final watchlist data:', watchlistData)
      setWatchlist(watchlistData)
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      setWatchlist([])
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchWatchlist()
  }, [user, fetchWatchlist])

  const retryFailedOperation = async () => {
    if (lastFailedOperation) {
      setHasError(false)
      try {
        await lastFailedOperation()
        setLastFailedOperation(null)
      } catch {
        setHasError(true)
      }
    }
  }

  const addToWatchlist = async (
    media: { id: number; title: string; poster_path: string; media_type: 'movie' | 'tv' },
    status: WatchStatus,
    initialProgress?: Partial<WatchlistEntry>
  ) => {
    if (!user) throw new Error('User must be logged in')

    // Set loading state
    setLoadingStates(prev => ({
      ...prev,
      adding: [...prev.adding, media.id]
    }))

    // Fetch media details to get genres
    let genres: string[] = [];
    try {
      interface MediaDetails {
        genres: Array<{ name: string }>;
      }
      const mediaDetails = await fetchWithAuth<MediaDetails>(`/api/tmdb?path=/${media.media_type}/${media.id}`);
      genres = mediaDetails.genres?.map(g => g.name) || [];
    } catch (error) {
      console.error('Error fetching media details:', error);
    }

    const optimisticEntry: WatchlistEntry = {
      id: `temp-${Date.now()}`,
      mediaId: media.id,
      mediaType: media.media_type,
      title: media.title,
      posterPath: media.poster_path,
      status,
      rating: null,
      notes: null,
      genres,
      // Include initial progress data if provided
      watchedSeconds: initialProgress?.watchedSeconds,
      totalDuration: initialProgress?.totalDuration,
      lastWatched: initialProgress?.lastWatched || new Date().toISOString(),
      currentSeason: initialProgress?.currentSeason,
      currentEpisode: initialProgress?.currentEpisode,
      totalSeasons: initialProgress?.totalSeasons,
      totalEpisodes: initialProgress?.totalEpisodes,
      nextAirDate: initialProgress?.nextAirDate,
      showStatus: initialProgress?.showStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setWatchlist((prev) => [...prev, optimisticEntry])

    try {
      const token = await user.getIdToken()
      interface WatchlistResponse {
        data: WatchlistEntry;
      }
      
      // Prepare request body with progress data if available
      const requestBody = {
        mediaId: media.id,
        mediaType: media.media_type,
        title: media.title,
        posterPath: media.poster_path,
        status,
        genres,
        // Include progress data if provided
        ...(initialProgress?.watchedSeconds !== undefined && { watchedSeconds: initialProgress.watchedSeconds }),
        ...(initialProgress?.totalDuration !== undefined && { totalDuration: initialProgress.totalDuration }),
        ...(initialProgress?.lastWatched && { lastWatched: initialProgress.lastWatched }),
        ...(initialProgress?.currentSeason !== undefined && { currentSeason: initialProgress.currentSeason }),
        ...(initialProgress?.currentEpisode !== undefined && { currentEpisode: initialProgress.currentEpisode }),
        ...(initialProgress?.totalSeasons !== undefined && { totalSeasons: initialProgress.totalSeasons }),
        ...(initialProgress?.totalEpisodes !== undefined && { totalEpisodes: initialProgress.totalEpisodes }),
      };

      const { data: newEntry } = await fetchWithAuth<WatchlistResponse>('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!isWatchlistEntry(newEntry)) {
        throw new Error('Invalid response data')
      }
      
      setWatchlist((prev) => 
        prev.map((entry) => 
          entry.id === optimisticEntry.id ? newEntry : entry
        )
      )
      setHasError(false)
    } catch (error) {
      setWatchlist((prev) => 
        prev.filter((entry) => entry.id !== optimisticEntry.id)
      )
      console.error('Error adding to watchlist:', error)
      setHasError(true)
      setLastFailedOperation(() => () => addToWatchlist(media, status, initialProgress))
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        adding: prev.adding.filter(id => id !== media.id)
      }))
    }
  }

  const updateWatchlistEntry = async (entryId: string, updates: Partial<WatchlistEntry>) => {
    if (!user) throw new Error('User must be logged in')

    setLoadingStates(prev => ({
      ...prev,
      updating: [...prev.updating, entryId]
    }))

    // Optimistically update the UI
    const oldEntry = watchlist.find(entry => entry.id === entryId)
    if (!oldEntry) throw new Error('Entry not found')

    const optimisticUpdate = {
      ...oldEntry,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    setWatchlist(prev =>
      prev.map(entry => entry.id === entryId ? optimisticUpdate : entry)
    )

    try {
      const token = await user.getIdToken()
      interface WatchlistResponse {
        data: WatchlistEntry;
      }
      const { data: updatedEntry } = await fetchWithAuth<WatchlistResponse>(`/api/watchlist/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!isWatchlistEntry(updatedEntry)) {
        throw new Error('Invalid response data')
      }

      setWatchlist(prev =>
        prev.map(entry => entry.id === entryId ? updatedEntry : entry)
      )
      setHasError(false)
    } catch (error) {
      // Revert the optimistic update
      setWatchlist(prev =>
        prev.map(entry => entry.id === entryId ? oldEntry : entry)
      )
      console.error('Error updating watchlist entry:', error)
      setHasError(true)
      setLastFailedOperation(() => () => updateWatchlistEntry(entryId, updates))
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        updating: prev.updating.filter(id => id !== entryId)
      }))
    }
  }

  const removeFromWatchlist = async (mediaId: number) => {
    if (!user) throw new Error('User must be logged in')

    setLoadingStates(prev => ({
      ...prev,
      removing: [...prev.removing, mediaId]
    }))

    const entry = watchlist.find(e => e.mediaId === mediaId)
    if (!entry) return

    const optimisticWatchlist = watchlist.filter(e => e.mediaId !== mediaId)
    setWatchlist(optimisticWatchlist)

    try {
      const token = await user.getIdToken()
      await fetchWithAuth(`/api/watchlist/${entry.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setHasError(false)
    } catch (error) {
      // Revert the optimistic delete
      setWatchlist(watchlist)
      console.error('Error removing from watchlist:', error)
      setHasError(true)
      setLastFailedOperation(() => () => removeFromWatchlist(mediaId))
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        removing: prev.removing.filter(id => id !== mediaId)
      }))
    }
  }

  const isInWatchlist = useCallback((mediaId: number) => {
    return watchlist.some((entry) => entry.mediaId === mediaId)
  }, [watchlist])

  const getWatchlistEntry = useCallback((mediaId: number) => {
    return watchlist.find((entry) => entry.mediaId === mediaId)
  }, [watchlist])

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        updateWatchlistEntry,
        removeFromWatchlist,
        isInWatchlist,
        getWatchlistEntry,
        isLoading,
        loadingStates,
        fetchWatchlist,
        hasError,
        retryFailedOperation,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  )
}

export const useWatchlist = () => useContext(WatchlistContext) 