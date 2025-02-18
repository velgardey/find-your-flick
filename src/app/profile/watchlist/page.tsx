'use client'

import { useState, useEffect } from 'react'
import { useWatchlist } from '@/contexts/WatchlistContext'
import { WatchStatus } from '@/lib/prismaTypes'
import { WatchlistEntry } from '@/types/media'
import Image from 'next/image'
import { LuStar, LuPencil, LuTrash2, LuChevronDown } from 'react-icons/lu'
import { motion, AnimatePresence } from 'framer-motion'
import MediaDetailsModal from '@/components/MediaDetailsModal'

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
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null)
  const [touchedMovieId, setTouchedMovieId] = useState<string | null>(null)
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null)
  const [selectedMediaType, setSelectedMediaType] = useState<'movie' | 'tv'>('movie')
  const [updatingEntryId, setUpdatingEntryId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<WatchlistEntry>>>({});

  const handleCardTouch = (movieId: string, event: React.MouseEvent) => {
    if (window.matchMedia('(hover: hover)').matches) return;
    
    event.preventDefault();
    setTouchedMovieId(touchedMovieId === movieId ? null : movieId);
  };

  const handleMovieClick = (mediaId: number, mediaType: 'movie' | 'tv', entryId: string, event: React.MouseEvent) => {
    if (!window.matchMedia('(hover: hover)').matches) {
      event.preventDefault();
      event.stopPropagation();
      if (touchedMovieId !== entryId) {
        handleCardTouch(entryId, event);
        return;
      }
    }
    setSelectedMediaId(mediaId);
    setSelectedMediaType(mediaType);
  };

  useEffect(() => {
    if (!touchedMovieId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.movie-card')) {
        setTouchedMovieId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [touchedMovieId]);

  const handleStatusChange = async (entryId: string, newStatus: WatchStatus) => {
    try {
      setUpdatingStatusId(entryId);
      // Apply optimistic update
      setOptimisticUpdates(prev => ({
        ...prev,
        [entryId]: { status: newStatus }
      }));
      
      await updateWatchlistEntry(entryId, { status: newStatus });
      setOpenStatusDropdown(null);
      
      // Clear optimistic update on success
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[entryId];
        return newUpdates;
      });
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[entryId];
        return newUpdates;
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Apply optimistic updates to the filtered list
  const optimisticWatchlist = watchlist.map(entry => ({
    ...entry,
    ...optimisticUpdates[entry.id]
  }));

  const filteredWatchlist = optimisticWatchlist
    .filter(entry => selectedStatus === 'ALL' || entry.status === selectedStatus)
    .filter(entry => 
      !searchQuery || entry.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleUpdateEntry = async (entryId: string) => {
    try {
      setUpdatingEntryId(entryId);
      await updateWatchlistEntry(entryId, {
        notes: editNote,
        rating: editRating,
      })
      setEditingEntry(null);
    } catch (error) {
      console.error('Error updating entry:', error)
    } finally {
      setUpdatingEntryId(null);
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
            <div className="relative w-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search movies..."
                    className="w-full px-4 py-2 bg-black/80 backdrop-blur-xl rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400 border border-white/10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40">
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
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredWatchlist.map(entry => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="movie-card relative group"
              >
                <div
                  onClick={(e) => handleMovieClick(entry.mediaId, entry.mediaType, entry.id, e)}
                  className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer"
                >
                  {entry.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${entry.posterPath}`}
                      alt={entry.title}
                      fill
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0XFyAeIB4gHh4gIB4dHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement?.classList.add('bg-gray-800');
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-400 text-sm text-center px-4">No poster available</span>
                    </div>
                  )}
                  <div className={`absolute inset-0 bg-black/60 flex flex-col justify-end p-4 transition-opacity duration-200 ${
                    touchedMovieId === entry.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <h3 className="text-sm font-medium truncate">{entry.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {entry.rating && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <LuStar className="w-3 h-3" />
                          <span>{entry.rating}/10</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      if (!window.matchMedia('(hover: hover)').matches) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (touchedMovieId !== entry.id) {
                          handleCardTouch(entry.id, e);
                          return;
                        }
                      }
                      setOpenStatusDropdown(openStatusDropdown === entry.id ? null : entry.id);
                    }}
                    className={`w-full px-2 py-1.5 text-xs flex items-center justify-between transition-colors ${
                      !window.matchMedia('(hover: hover)').matches && touchedMovieId !== entry.id 
                        ? 'pointer-events-none' 
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <span className="text-gray-300">{watchStatusLabels[entry.status as WatchStatus]}</span>
                    <LuChevronDown className={`w-4 h-4 transition-transform ${openStatusDropdown === entry.id ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {openStatusDropdown === entry.id && (window.matchMedia('(hover: hover)').matches || touchedMovieId === entry.id) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 right-0 bottom-full z-20 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg overflow-hidden"
                      >
                        <div className={`p-1 ${!window.matchMedia('(hover: hover)').matches && touchedMovieId !== entry.id ? 'pointer-events-none' : ''}`}>
                          {Object.entries(watchStatusLabels).map(([status, label]) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(entry.id, status as WatchStatus)}
                              disabled={updatingStatusId === entry.id}
                              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                                entry.status === status ? 'bg-white/20 text-white' : 'text-gray-300'
                              } ${updatingStatusId === entry.id ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              {updatingStatusId === entry.id ? 'Updating...' : label}
                            </button>
                          ))}
                          <div className="h-px bg-white/10 my-1" />
                          <button
                            onClick={() => {
                              setEditingEntry(entry.id);
                              setEditNote(entry.notes ?? '');
                              setEditRating(entry.rating);
                              setOpenStatusDropdown(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                          >
                            <LuPencil className="w-3 h-3" />
                            <span>Edit Details</span>
                          </button>
                          <button
                            onClick={() => {
                              removeFromWatchlist(entry.mediaId);
                              setOpenStatusDropdown(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            <LuTrash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {editingEntry === entry.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 right-0 bottom-full z-20 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-lg overflow-hidden p-3"
                      >
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Rating</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={editRating || ''}
                              onChange={(e) => setEditRating(e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-2 py-1 text-xs bg-white/10 rounded focus:outline-none focus:ring-1 focus:ring-white/20"
                              placeholder="Rate from 1-10"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Notes</label>
                            <textarea
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-white/10 rounded focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
                              placeholder="Add notes..."
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingEntry(null)}
                              className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateEntry(entry.id)}
                              disabled={updatingEntryId === entry.id}
                              className={`px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors ${
                                updatingEntryId === entry.id ? 'opacity-50 cursor-wait' : ''
                              }`}
                            >
                              {updatingEntryId === entry.id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <MediaDetailsModal
        mediaId={selectedMediaId}
        mediaType={selectedMediaType}
        onClose={() => setSelectedMediaId(null)}
      />
    </div>
  )
} 