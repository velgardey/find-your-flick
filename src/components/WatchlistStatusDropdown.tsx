'use client'

import { useState } from 'react'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { WatchStatus } from '@/lib/prismaTypes'
import { LuChevronDown } from 'react-icons/lu'
import Dropdown from './ui/Dropdown'

interface WatchlistStatusDropdownProps {
  entryId: string
  currentStatus: WatchStatus
  isEnabled?: boolean
}

const watchStatusLabels: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
}

export default function WatchlistStatusDropdown({ 
  entryId, 
  currentStatus,
  isEnabled = true 
}: WatchlistStatusDropdownProps) {
  const { updateWatchlistEntry } = useWatchlist()
  const [isOpen, setIsOpen] = useState(false)

  const handleStatusSelect = async (status: WatchStatus) => {
    if (!isEnabled) return
    
    try {
      await updateWatchlistEntry(entryId, { status })
    } catch (error) {
      console.error('Error updating watchlist status:', error)
    }
    setIsOpen(false)
  }

  const trigger = (
    <button
      onClick={() => isEnabled && setIsOpen(!isOpen)}
      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm
        ${isEnabled ? 'bg-black/40 hover:bg-black/60' : 'bg-black/20 cursor-not-allowed'}`}
    >
      <span>{watchStatusLabels[currentStatus]}</span>
      <LuChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )

  return (
    <Dropdown
      isOpen={isOpen && isEnabled}
      onClose={() => setIsOpen(false)}
      trigger={trigger}
    >
      {Object.entries(watchStatusLabels).map(([status, label]) => (
        <button
          key={status}
          onClick={(e) => {
            e.stopPropagation()
            handleStatusSelect(status as WatchStatus)
          }}
          className={`w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 transition-colors ${
            currentStatus === status ? 'text-white' : 'text-gray-300'
          }`}
        >
          {label}
        </button>
      ))}
    </Dropdown>
  )
} 