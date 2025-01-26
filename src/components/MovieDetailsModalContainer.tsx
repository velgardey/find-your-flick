'use client'
import { useEffect } from 'react';
import MovieDetailsModal from './MovieDetailsModal';

interface MovieDetailsModalContainerProps {
  selectedMovieId: number | null;
  onClose: () => void;
}

export default function MovieDetailsModalContainer({
  selectedMovieId,
  onClose,
}: MovieDetailsModalContainerProps) {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"]')) return;
      onClose();
    };

    if (selectedMovieId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedMovieId, onClose]);

  if (!selectedMovieId) return null;

  return <MovieDetailsModal movieId={selectedMovieId} onClose={onClose} />;
} 