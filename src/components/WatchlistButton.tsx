'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { useRouter } from 'next/navigation'
import { LuPlus, LuCheck, LuChevronDown, LuTrash2, LuLoader, LuX } from 'react-icons/lu'
import { WatchStatus } from '@/lib/prismaTypes'
import Dropdown from './ui/Dropdown'
import { motion } from 'framer-motion'

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
  const { 
    isInWatchlist, 
    getWatchlistEntry, 
    addToWatchlist, 
    updateWatchlistEntry, 
    removeFromWatchlist,
    loadingStates,
    hasError,
    retryFailedOperation
  } = useWatchlist()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const watchlistEntry = getWatchlistEntry(movie.id)
  const isInList = isInWatchlist(movie.id)

  const isLoading = 
    loadingStates.adding.includes(movie.id) ||
    (watchlistEntry && loadingStates.updating.includes(watchlistEntry.id)) ||
    loadingStates.removing.includes(movie.id)

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

  const handleRemove = async () => {
    if (!user || !isInList) return

    try {
      await removeFromWatchlist(movie.id)
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
    setIsDropdownOpen(false)
  }

  const trigger = (
    <motion.button
      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg transition-colors relative overflow-hidden ${
        isInList
          ? 'bg-white/20 hover:bg-white/30 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white'
      } ${isLoading ? 'cursor-wait' : ''} ${hasError ? 'border-red-500/50' : ''}`}
      disabled={isLoading}
      whileHover={{ scale: isLoading ? 1 : 1.02 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
    >
      <div className="flex items-center gap-2">
        {isLoading ? (
          <>
            <LuLoader className="w-5 h-5 animate-spin" />
            <span>Updating...</span>
          </>
        ) : hasError ? (
          <>
            <LuX className="w-5 h-5 text-red-400" />
            <span>Error</span>
          </>
        ) : isInList ? (
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
      <div className="flex items-center gap-2">
        {hasError && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              retryFailedOperation()
            }}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Retry
          </motion.button>
        )}
        <LuChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isLoading && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      )}
    </motion.button>
  )

  return (
    <Dropdown
      isOpen={isDropdownOpen && !isLoading && !hasError}
      onClose={() => setIsDropdownOpen(false)}
      trigger={trigger}
      className="py-2"
    >
      {Object.entries(watchStatusLabels).map(([status, label]) => (
        <motion.button
          key={status}
          onClick={() => handleStatusSelect(status as WatchStatus)}
          className={`w-full px-4 py-2 text-left hover:bg-white/10 transition-colors ${
            watchlistEntry?.status === status ? 'text-white' : 'text-gray-300'
          }`}
          whileHover={{ x: 4 }}
        >
          {label}
        </motion.button>
      ))}
      {isInList && (
        <motion.button
          onClick={handleRemove}
          className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/10 transition-colors flex items-center gap-2"
          whileHover={{ x: 4 }}
        >
          <LuTrash2 className="w-4 h-4" />
          Remove from Watchlist
        </motion.button>
      )}
    </Dropdown>
  )
} 