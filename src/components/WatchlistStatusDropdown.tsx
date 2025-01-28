'use client'

import { useState } from 'react'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { WatchStatus } from '@/lib/prismaTypes'
import { LuChevronDown } from 'react-icons/lu'
import Dropdown from './ui/Dropdown'

interface WatchlistStatusDropdownProps {
  mediaId: number;
  status: WatchStatus;
  onStatusChange: (status: WatchStatus) => void;
  onRemove: () => void;
}

const watchStatusLabels: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
}

export default function WatchlistStatusDropdown({
  mediaId,
  status,
  onStatusChange,
  onRemove
}: WatchlistStatusDropdownProps) {
  const { removeFromWatchlist } = useWatchlist()
  const [isOpen, setIsOpen] = useState(false)

  const handleStatusChange = async (newStatus: WatchStatus) => {
    onStatusChange(newStatus)
    setIsOpen(false)
  }

  const handleRemove = async () => {
    try {
      await removeFromWatchlist(mediaId)
      onRemove()
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
    setIsOpen(false)
  }

  const trigger = (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm
        ${'bg-black/40 hover:bg-black/60'}`}
    >
      <span>{watchStatusLabels[status]}</span>
      <LuChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )

  return (
    <Dropdown
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      trigger={trigger}
    >
      {Object.entries(watchStatusLabels).map(([status, label]) => (
        <button
          key={status}
          onClick={(e) => {
            e.stopPropagation()
            handleStatusChange(status as WatchStatus)
          }}
          className={`w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 transition-colors ${
            status === status ? 'text-white' : 'text-gray-300'
          }`}
        >
          {label}
        </button>
      ))}
      <div className="my-1 border-t border-white/10" />
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleRemove()
        }}
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-white/10 transition-colors"
      >
        Remove from Watchlist
      </button>
    </Dropdown>
  )
} 