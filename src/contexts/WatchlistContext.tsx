'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { WatchStatus } from '@/lib/prismaTypes'
import { fetchWithAuth } from '@/lib/api'

interface WatchlistEntry {
  id: string
  mediaId: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath: string | null
  status: WatchStatus
  rating: number | null
  notes: string | null
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
  addToWatchlist: (media: { id: number; title: string; poster_path: string; media_type: 'movie' | 'tv' }, status: WatchStatus) => Promise<void>
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
  if (typeof item !== 'object' || item === null) return false
  
  const entry = item as Record<string, unknown>
  
  return (
    typeof entry.id === 'string' &&
    typeof entry.mediaId === 'number' &&
    typeof entry.mediaType === 'string' &&
    (entry.mediaType === 'movie' || entry.mediaType === 'tv') &&
    typeof entry.title === 'string' &&
    (entry.posterPath === null || typeof entry.posterPath === 'string') &&
    typeof entry.status === 'string' &&
    (entry.rating === null || typeof entry.rating === 'number') &&
    (entry.notes === null || typeof entry.notes === 'string') &&
    typeof entry.createdAt === 'string' &&
    typeof entry.updatedAt === 'string' &&
    (entry.currentSeason === undefined || typeof entry.currentSeason === 'number') &&
    (entry.currentEpisode === undefined || typeof entry.currentEpisode === 'number') &&
    (entry.totalSeasons === undefined || typeof entry.totalSeasons === 'number') &&
    (entry.totalEpisodes === undefined || typeof entry.totalEpisodes === 'number') &&
    (entry.nextAirDate === undefined || typeof entry.nextAirDate === 'string') &&
    (entry.showStatus === undefined || typeof entry.showStatus === 'string') &&
    Array.isArray(entry.genres) && entry.genres.every(g => typeof g === 'string')
  )
}

function isWatchlistArray(data: unknown): data is WatchlistEntry[] {
  return Array.isArray(data) && data.every(isWatchlistEntry)
}

interface WatchlistResponse {
  data: WatchlistEntry[]
}

function isWatchlistResponse(data: unknown): data is WatchlistResponse {
  if (typeof data !== 'object' || data === null) return false
  
  // Handle direct array response
  if (isWatchlistArray(data)) {
    return true
  }
  
  // Handle response wrapped in data property
  const response = data as Record<string, unknown>
  return 'data' in response && isWatchlistArray(response.data)
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
        
      const responseData = await fetchWithAuth(url)
      
      // Validate and transform the data
      if (!isWatchlistResponse(responseData)) {
        console.error('Invalid watchlist data received:', responseData)
        setWatchlist([])
        return
      }
      
      // Handle both direct array and wrapped response
      setWatchlist(Array.isArray(responseData) ? responseData : responseData.data)
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
    status: WatchStatus
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
      currentSeason: undefined,
      currentEpisode: undefined,
      totalSeasons: undefined,
      totalEpisodes: undefined,
      nextAirDate: undefined,
      showStatus: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setWatchlist((prev) => [...prev, optimisticEntry])

    try {
      const token = await user.getIdToken()
      interface WatchlistResponse {
        data: WatchlistEntry;
      }
      const { data: newEntry } = await fetchWithAuth<WatchlistResponse>('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaId: media.id,
          mediaType: media.media_type,
          title: media.title,
          posterPath: media.poster_path,
          status,
          genres,
        }),
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
      setLastFailedOperation(() => () => addToWatchlist(media, status))
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