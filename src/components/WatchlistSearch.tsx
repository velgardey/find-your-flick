'use client'

import { useState } from 'react'
import { LuSearch } from 'react-icons/lu'

interface WatchlistSearchProps {
  onSearch: (query: string) => void
}

export default function WatchlistSearch({ onSearch }: WatchlistSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query)
  }

  return (
    <div className="relative w-full sm:w-96">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search movies in your watchlist..."
          className="w-full h-12 px-4 py-2 pl-12 bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder-gray-400 text-lg"
        />
        <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
      </div>
    </div>
  )
} 