'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { useRouter } from 'next/navigation'
import { LuPlus, LuCheck, LuChevronDown, LuTrash2, LuLoader, LuX, LuPlay, LuPause, LuStar } from 'react-icons/lu'
import { WatchStatus } from '@/lib/prismaTypes'
import Dropdown from './ui/Dropdown'
import { motion } from 'framer-motion'
import RatingModal from './RatingModal'

interface Media {
  id: number;
  title: string;
  poster_path: string;
  media_type: 'movie' | 'tv';
}

interface WatchlistButtonProps {
  media: Media;
  position?: 'top' | 'bottom';
}

const watchStatusLabels: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
}

export default function WatchlistButton({ media, position = 'bottom' }: WatchlistButtonProps) {
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
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)

  const watchlistEntry = getWatchlistEntry(media.id)
  const isInList = isInWatchlist(media.id)

  const isLoading = 
    loadingStates.adding.includes(media.id) ||
    (watchlistEntry && loadingStates.updating.includes(watchlistEntry.id)) ||
    loadingStates.removing.includes(media.id)

  const handleStatusSelect = async (status: WatchStatus) => {
    if (!user) {
      localStorage.setItem('redirectPath', window.location.pathname);
      router.replace('/auth/error');
      return;
    }

    try {
      if (status === WatchStatus.WATCHED) {
        if (isInList && watchlistEntry) {
          await updateWatchlistEntry(watchlistEntry.id, { status })
        } else {
          await addToWatchlist(media, status)
        }
        setIsRatingModalOpen(true)
      } else {
        if (isInList && watchlistEntry) {
          if (watchlistEntry.status === WatchStatus.WATCHED) {
            await updateWatchlistEntry(watchlistEntry.id, { status, rating: null })
          } else {
            await updateWatchlistEntry(watchlistEntry.id, { status })
          }
        } else {
          await addToWatchlist(media, status)
        }
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
    setIsDropdownOpen(false)
  }

  const handleRatingSubmit = async (rating: number) => {
    if (!watchlistEntry) return

    try {
      await updateWatchlistEntry(watchlistEntry.id, { rating })
    } catch (error) {
      console.error('Error updating rating:', error)
    }
  }

  const handleRemove = async () => {
    if (!user) {
      localStorage.setItem('redirectPath', window.location.pathname);
      router.replace('/auth/error');
      return;
    }

    if (!isInList) return

    try {
      await removeFromWatchlist(media.id)
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
    setIsDropdownOpen(false)
  }

  const handleClick = () => {
    if (!user) {
      localStorage.setItem('redirectPath', window.location.pathname);
      router.replace('/auth/error');
      return;
    }
    setIsDropdownOpen(!isDropdownOpen)
  }

  const getStatusColor = (status: WatchStatus) => {
    switch (status) {
      case 'WATCHING':
        return 'from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-blue-400';
      case 'WATCHED':
        return 'from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400';
      case 'PLAN_TO_WATCH':
        return 'from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-400';
      case 'ON_HOLD':
        return 'from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-400';
      case 'DROPPED':
        return 'from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 text-red-400';
      default:
        return 'from-gray-500/20 to-slate-500/20 hover:from-gray-500/30 hover:to-slate-500/30 text-gray-400';
    }
  };

  const getStatusIcon = (status: WatchStatus) => {
    switch (status) {
      case 'WATCHING':
        return <LuPlay className="w-4 h-4" />;
      case 'WATCHED':
        return <LuCheck className="w-4 h-4" />;
      case 'PLAN_TO_WATCH':
        return <LuPlus className="w-4 h-4" />;
      case 'ON_HOLD':
        return <LuPause className="w-4 h-4" />;
      case 'DROPPED':
        return <LuX className="w-4 h-4" />;
      default:
        return <LuPlus className="w-4 h-4" />;
    }
  };

  const trigger = (
    <motion.button
      onClick={handleClick}
      className={`inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-300 relative overflow-hidden backdrop-blur-sm ${
        isInList
          ? `bg-gradient-to-r ${getStatusColor(watchlistEntry!.status)} shadow-lg shadow-black/20`
          : 'bg-white/10 hover:bg-white/20 text-white hover:shadow-lg hover:shadow-black/20'
      } ${isLoading ? 'cursor-wait' : ''} ${hasError ? 'from-red-500/20 to-pink-500/20 border-red-500/50' : ''}`}
      disabled={isLoading}
      whileHover={{ scale: isLoading ? 1 : 1.02 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium min-w-0 max-w-[120px]">
        <span className="flex-shrink-0">
          {isLoading ? (
            <LuLoader className="w-3.5 h-3.5 animate-spin" />
          ) : hasError ? (
            <LuX className="w-3.5 h-3.5 text-red-400" />
          ) : isInList ? (
            getStatusIcon(watchlistEntry!.status)
          ) : (
            <LuPlus className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="truncate">
          {isLoading ? (
            <span className="animate-pulse">Updating...</span>
          ) : hasError ? (
            "Error"
          ) : isInList ? (
            <div className="flex items-center gap-2">
              <span>{watchStatusLabels[watchlistEntry!.status]}</span>
              {watchlistEntry!.rating && (
                <div className="flex items-center gap-0.5 text-yellow-400">
                  <LuStar className="w-3 h-3 fill-current" />
                  <span>{watchlistEntry!.rating}</span>
                </div>
              )}
            </div>
          ) : (
            "Add"
          )}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {hasError && (
          <motion.div
            onClick={(e) => {
              e.stopPropagation()
              retryFailedOperation()
            }}
            className="text-[10px] bg-red-500/20 hover:bg-red-500/30 text-red-400 px-1.5 py-0.5 rounded-md font-medium backdrop-blur-sm cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Retry
          </motion.div>
        )}
        <LuChevronDown 
          className={`w-3 h-3 transition-transform duration-300 ease-spring ${isDropdownOpen ? 'rotate-180' : ''}`} 
        />
      </div>
      
      {isLoading && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      )}
    </motion.button>
  )

  return (
    <div className="inline-block">
      <Dropdown
        isOpen={isDropdownOpen && !isLoading && !hasError}
        onClose={() => setIsDropdownOpen(false)}
        trigger={trigger}
        className="py-1"
        position={position}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden shadow-xl ring-1 ring-white/5 min-w-[160px]"
        >
          {Object.entries(watchStatusLabels).map(([status, label], index) => (
            <motion.button
              key={status}
              onClick={() => handleStatusSelect(status as WatchStatus)}
              className={`w-full px-2.5 py-1.5 text-left text-sm hover:bg-white/10 transition-all flex items-center gap-2 group ${
                watchlistEntry?.status === status 
                  ? `bg-gradient-to-r ${getStatusColor(status as WatchStatus)} font-medium`
                  : 'text-gray-300 hover:text-white'
              }`}
              whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                {watchlistEntry?.status === status ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    {getStatusIcon(status as WatchStatus)}
                  </motion.span>
                ) : (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {getStatusIcon(status as WatchStatus)}
                  </motion.span>
                )}
              </span>
              <span className="flex-1 truncate">{label}</span>
              {watchlistEntry?.status === status && watchlistEntry.rating && (
                <div className="flex items-center gap-0.5 text-yellow-400">
                  <LuStar className="w-3 h-3 fill-current" />
                  <span>{watchlistEntry.rating}</span>
                </div>
              )}
            </motion.button>
          ))}
          {isInList && (
            <>
              <div className="mx-2 border-t border-white/10" />
              <motion.button
                onClick={handleRemove}
                className="w-full px-2.5 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2 group"
                whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Object.keys(watchStatusLabels).length * 0.05, type: "spring", stiffness: 400, damping: 25 }}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                  <LuTrash2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <span className="truncate">Remove</span>
              </motion.button>
            </>
          )}
        </motion.div>
      </Dropdown>

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        onSubmit={handleRatingSubmit}
        mediaTitle={media.title}
      />
    </div>
  )
} 