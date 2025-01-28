'use client'
import { useEffect } from 'react';
import MediaDetailsModal from './MediaDetailsModal';

interface MediaDetailsModalContainerProps {
  selectedMediaId: number | null;
  mediaType: 'movie' | 'tv';
  onClose: () => void;
}

export default function MediaDetailsModalContainer({
  selectedMediaId,
  mediaType,
  onClose,
}: MediaDetailsModalContainerProps) {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!e.target) return;
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"]')) return;
      onClose();
    };

    if (selectedMediaId) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedMediaId, onClose]);

  if (!selectedMediaId) return null;

  return <MediaDetailsModal mediaId={selectedMediaId} mediaType={mediaType} onClose={onClose} />;
} 