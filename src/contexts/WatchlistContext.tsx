'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { WatchStatus } from '@/lib/prismaTypes'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

interface WatchlistEntry {
  id: string
  movieId: number
  title: string
  posterPath: string | null
  status: WatchStatus
  rating: number | null
  notes: string | null
  createdAt: string
}

interface LoadingStates {
  adding: number[]      // movieIds that are being added
  updating: string[]    // entryIds that are being updated
  removing: number[]    // movieIds that are being removed
}

interface WatchlistContextType {
  watchlist: WatchlistEntry[]
  addToWatchlist: (movie: { id: number; title: string; poster_path: string }, status: WatchStatus) => Promise<void>
  updateWatchlistEntry: (entryId: string, updates: Partial<WatchlistEntry>) => Promise<void>
  removeFromWatchlist: (movieId: number) => Promise<void>
  isInWatchlist: (movieId: number) => boolean
  getWatchlistEntry: (movieId: number) => WatchlistEntry | undefined
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
    typeof entry.movieId === 'number' &&
    typeof entry.title === 'string' &&
    (entry.posterPath === null || typeof entry.posterPath === 'string') &&
    typeof entry.status === 'string' &&
    (entry.rating === null || typeof entry.rating === 'number') &&
    (entry.notes === null || typeof entry.notes === 'string') &&
    typeof entry.createdAt === 'string'
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
      const token = await user.getIdToken()
      const url = searchQuery 
        ? `/api/watchlist?search=${encodeURIComponent(searchQuery)}`
        : '/api/watchlist'
        
      const response = await fetchWithRetry(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          setWatchlist([])
          return
      }
        throw new Error('Failed to fetch watchlist')
    }

      const responseData = await response.json()
      
      // Validate and transform the data
      if (!isWatchlistResponse(responseData)) {
        console.error('Invalid watchlist data received:', responseData)
        setWatchlist([])
        return
      }
      
      setWatchlist(responseData.data)
    } catch {
      console.error('Error fetching watchlist')
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
    movie: { id: number; title: string; poster_path: string },
    status: WatchStatus
  ) => {
    if (!user) throw new Error('User must be logged in')

    // Set loading state
    setLoadingStates(prev => ({
      ...prev,
      adding: [...prev.adding, movie.id]
    }))

    const optimisticEntry: WatchlistEntry = {
      id: `temp-${Date.now()}`,
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      status,
      rating: null,
      notes: null,
      createdAt: new Date().toISOString(),
    }

    setWatchlist((prev) => [...prev, optimisticEntry])

    try {
      const token = await user.getIdToken()
      const response = await fetchWithRetry('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          movieId: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          status,
        }),
      })

      if (!response.ok) throw new Error('Failed to add to watchlist')
      const responseData = await response.json()
      if (!isWatchlistEntry(responseData.data)) {
        throw new Error('Invalid response data')
      }

      setWatchlist((prev) => 
        prev.map((entry) => 
          entry.id === optimisticEntry.id ? responseData.data : entry
        )
      )
      setHasError(false)
    } catch (error) {
      setWatchlist((prev) => 
        prev.filter((entry) => entry.id !== optimisticEntry.id)
      )
      console.error('Error adding to watchlist:', error)
      setHasError(true)
      setLastFailedOperation(() => () => addToWatchlist(movie, status))
      throw error
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        adding: prev.adding.filter(id => id !== movie.id)
      }))
    }
  }

  const updateWatchlistEntry = async (entryId: string, updates: Partial<WatchlistEntry>) => {
    if (!user) throw new Error('User must be logged in')

    setLoadingStates(prev => ({
      ...prev,
      updating: [...prev.updating, entryId]
    }))

    const currentEntry = watchlist.find(entry => entry.id === entryId)
    if (!currentEntry) throw new Error('Entry not found')

    setWatchlist((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry))
    )

    try {
      const token = await user.getIdToken()
      const response = await fetchWithRetry(`/api/watchlist/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update watchlist entry')
      const responseData = await response.json()
      
      if (!isWatchlistEntry(responseData.data)) {
        throw new Error('Invalid response data')
      }

      setWatchlist((prev) =>
        prev.map((entry) => (entry.id === entryId ? responseData.data : entry))
      )
      setHasError(false)
    } catch (error) {
      setWatchlist((prev) =>
        prev.map((entry) => (entry.id === entryId ? currentEntry : entry))
      )
      console.error('Error updating watchlist entry:', error)
      setHasError(true)
      setLastFailedOperation(() => () => updateWatchlistEntry(entryId, updates))
      throw error
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        updating: prev.updating.filter(id => id !== entryId)
      }))
    }
  }

  const removeFromWatchlist = async (movieId: number) => {
    if (!user) throw new Error('User must be logged in')

    setLoadingStates(prev => ({
      ...prev,
      removing: [...prev.removing, movieId]
    }))

    const entryToRemove = watchlist.find(entry => entry.movieId === movieId)
    if (!entryToRemove) return

    setWatchlist((prev) => prev.filter((entry) => entry.movieId !== movieId))

    try {
      const token = await user.getIdToken()
      const response = await fetchWithRetry(`/api/watchlist?movieId=${movieId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to remove from watchlist')
      const responseData = await response.json()

      if (!responseData.data?.success) {
        throw new Error('Failed to remove from watchlist')
      }
      setHasError(false)
    } catch (error) {
      setWatchlist((prev) => [...prev, entryToRemove])
      console.error('Error removing from watchlist:', error)
      setHasError(true)
      setLastFailedOperation(() => () => removeFromWatchlist(movieId))
      throw error
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        removing: prev.removing.filter(id => id !== movieId)
      }))
    }
  }

  const isInWatchlist = useCallback((movieId: number) => {
    return Array.isArray(watchlist) && watchlist.some((entry) => entry.movieId === movieId)
  }, [watchlist])

  const getWatchlistEntry = useCallback((movieId: number) => {
    return Array.isArray(watchlist) ? watchlist.find((entry) => entry.movieId === movieId) : undefined
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