'use client'

import { useState } from 'react'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { WatchStatus } from '@/lib/prismaTypes'
import Image from 'next/image'
import { LuStar, LuPencil, LuTrash2, LuSearch } from 'react-icons/lu'

const watchStatusLabels: Record<WatchStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  WATCHED: 'Watched',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
}

export default function WatchlistPage() {
  const { watchlist, updateWatchlistEntry, removeFromWatchlist, isLoading } = useWatchlist()
  const [selectedStatus, setSelectedStatus] = useState<WatchStatus | 'ALL'>('ALL')
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editRating, setEditRating] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const filteredWatchlist = watchlist
    .filter(entry => selectedStatus === 'ALL' || entry.status === selectedStatus)
    .filter(entry => 
      !searchQuery || entry.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleUpdateEntry = async (entryId: string) => {
    try {
      await updateWatchlistEntry(entryId, {
        notes: editNote,
        rating: editRating,
      })
      setEditingEntry(null)
    } catch (error) {
      console.error('Error updating entry:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold">My Watchlist</h1>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  selectedStatus === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                }`}
              >
                All
              </button>
              {Object.entries(watchStatusLabels).map(([status, label]) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status as WatchStatus)}
                  className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    selectedStatus === status
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="relative flex items-center">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    isSearchOpen ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <LuSearch className="w-5 h-5" />
                </button>
                <div className={`absolute right-0 top-0 h-full flex items-center transition-all duration-300 ${
                  isSearchOpen ? 'w-64 opacity-100 ml-2' : 'w-0 opacity-0'
                }`}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search movies..."
                    className={`w-full h-full px-4 py-2 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400 ${
                      isSearchOpen ? 'block' : 'hidden'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredWatchlist.map(entry => (
              <div
                key={entry.id}
                className="bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10"
              >
                <div className="flex">
                  <div className="relative w-1/3 aspect-[2/3]">
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${entry.posterPath}`}
                      alt={entry.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4">
                    <h3 className="text-lg font-semibold mb-2">{entry.title}</h3>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-300">
                        {watchStatusLabels[entry.status]}
                      </span>
                      {entry.rating && (
                        <div className="flex items-center gap-1">
                          <LuStar className="w-4 h-4 text-yellow-500" />
                          <span>{entry.rating}/10</span>
                        </div>
                      )}
                    </div>

                    {editingEntry === entry.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Rating
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={editRating ?? ''}
                            onChange={e => setEditRating(parseInt(e.target.value) || null)}
                            className="w-full bg-black/30 rounded-lg px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            className="w-full bg-black/30 rounded-lg px-3 py-2 min-h-[80px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateEntry(entry.id)}
                            className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingEntry(null)}
                            className="flex-1 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {entry.notes && (
                          <p className="text-sm text-gray-300 mb-4">{entry.notes}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingEntry(entry.id)
                              setEditNote(entry.notes ?? '')
                              setEditRating(entry.rating)
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg"
                          >
                            <LuPencil className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(entry.movieId)}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 px-4 py-2 rounded-lg text-red-300"
                          >
                            <LuTrash2 className="w-4 h-4" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 