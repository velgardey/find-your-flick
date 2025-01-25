'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { useRouter } from 'next/navigation'
import { LuPlus, LuCheck, LuChevronDown } from 'react-icons/lu'
import { WatchStatus } from '@/lib/prismaTypes'

interface Movie {
  id: number
  title: string
  poster_path: string
}

interface WatchlistButtonProps {
  movie: Movie
}

const watchStatusLabels: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
}

export default function WatchlistButton({ movie }: WatchlistButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { isInWatchlist, getWatchlistEntry, addToWatchlist, updateWatchlistEntry } = useWatchlist()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')

  const watchlistEntry = getWatchlistEntry(movie.id)
  const isInList = isInWatchlist(movie.id)

  useEffect(() => {
    if (!isDropdownOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  useEffect(() => {
    if (!isDropdownOpen || !dropdownRef.current) return

    const buttonRect = dropdownRef.current.getBoundingClientRect()
    const dropdownHeight = 200 // Approximate height of dropdown with all options
    const windowHeight = window.innerHeight
    const spaceBelow = windowHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      setDropdownPosition('top')
    } else {
      setDropdownPosition('bottom')
    }
  }, [isDropdownOpen])

  const handleStatusSelect = async (status: WatchStatus) => {
    if (!user) {
      router.push('/auth')
      return
    }

    try {
      if (isInList && watchlistEntry) {
        await updateWatchlistEntry(watchlistEntry.id, { status })
      } else {
        await addToWatchlist(movie, status)
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
    setIsDropdownOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg transition-colors ${
          isInList
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {isInList ? (
            <>
              <LuCheck className="w-5 h-5" />
              <span>{watchStatusLabels[watchlistEntry!.status]}</span>
            </>
          ) : (
            <>
              <LuPlus className="w-5 h-5" />
              <span>Add to Watchlist</span>
            </>
          )}
        </div>
        <LuChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div 
          className={`absolute left-0 right-0 ${
            dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          } py-2 bg-black/90 backdrop-blur-xl rounded-lg shadow-lg border border-white/10 z-50`}
        >
          {Object.entries(watchStatusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => handleStatusSelect(status as WatchStatus)}
              className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
                watchlistEntry?.status === status ? 'text-white' : 'text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 