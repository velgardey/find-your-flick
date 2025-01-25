'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { WatchStatus } from '@/lib/prismaTypes'

interface WatchlistEntry {
  id: string
  movieId: number
  title: string
  posterPath: string | null
  status: WatchStatus
  rating: number | null
  notes: string | null
}

interface WatchlistContextType {
  watchlist: WatchlistEntry[]
  addToWatchlist: (movie: { id: number; title: string; poster_path: string }, status: WatchStatus) => Promise<void>
  updateWatchlistEntry: (entryId: string, updates: Partial<WatchlistEntry>) => Promise<void>
  removeFromWatchlist: (movieId: number) => Promise<void>
  isInWatchlist: (movieId: number) => boolean
  getWatchlistEntry: (movieId: number) => WatchlistEntry | undefined
  isLoading: boolean
  fetchWatchlist: (searchQuery?: string) => Promise<void>
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  addToWatchlist: async () => {},
  updateWatchlistEntry: async () => {},
  removeFromWatchlist: async () => {},
  isInWatchlist: () => false,
  getWatchlistEntry: () => undefined,
  isLoading: false,
  fetchWatchlist: async () => {},
})

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
        
      const response = await fetch(url, {
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
      
      const data = await response.json()
      setWatchlist(data)
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

  const addToWatchlist = async (
    movie: { id: number; title: string; poster_path: string },
    status: WatchStatus
  ) => {
    if (!user) throw new Error('User must be logged in')

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/watchlist', {
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
      const newEntry = await response.json()
      setWatchlist((prev) => [...prev, newEntry])
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      throw error
    }
  }

  const updateWatchlistEntry = async (entryId: string, updates: Partial<WatchlistEntry>) => {
    if (!user) throw new Error('User must be logged in')

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/watchlist/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error('Failed to update watchlist entry')
      const updatedEntry = await response.json()
      setWatchlist((prev) =>
        prev.map((entry) => (entry.id === entryId ? updatedEntry : entry))
      )
    } catch (error) {
      console.error('Error updating watchlist entry:', error)
      throw error
    }
  }

  const removeFromWatchlist = async (movieId: number) => {
    if (!user) throw new Error('User must be logged in')

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/watchlist?movieId=${movieId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to remove from watchlist')
      setWatchlist((prev) => prev.filter((entry) => entry.movieId !== movieId))
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      throw error
    }
  }

  const isInWatchlist = (movieId: number) => {
    return watchlist.some((entry) => entry.movieId === movieId)
  }

  const getWatchlistEntry = (movieId: number) => {
    return watchlist.find((entry) => entry.movieId === movieId)
  }

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
        fetchWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  )
}

export const useWatchlist = () => useContext(WatchlistContext) 