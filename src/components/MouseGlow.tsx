'use client'

import { useEffect, useState, useRef } from 'react';


interface Props {
  onMediaChange?: (mediaId: number, mediaType: 'movie' | 'tv') => void;
}

export default function MouseGlow({ onMediaChange }: Props) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const [isTouching, setIsTouching] = useState(false);
  const onMediaChangeRef = useRef(onMediaChange);

  // Keep ref updated with latest callback
  useEffect(() => {
    onMediaChangeRef.current = onMediaChange;
  }, [onMediaChange]);

  useEffect(() => {
    // Fetch a single random movie backdrop when component mounts
    const fetchRandomBackdrop = async () => {
      try {
        // We still need to use the direct API call here since we need a list of movies
        // rather than details for a specific movie
        const response = await fetch('/api/tmdb?path=/movie/popular?language=en-US&page=1');
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.results.length);
          const movie = data.results[randomIndex];
          
          if (movie.backdrop_path) {
            setBackdrop(`https://image.tmdb.org/t/p/original${movie.backdrop_path}`);
            onMediaChangeRef.current?.(movie.id, 'movie');
          }
        }
      } catch (error) {
        console.error('Error fetching backdrop:', error);
      }
    };

    fetchRandomBackdrop();
  }, []); // Only run once when component mounts

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      setIsTouching(true);
      setPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handleTouchEnd = () => {
      setIsTouching(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []); // Run only once on mount

  if (!backdrop) return null;

  return (
    <div className="fixed inset-0 isolate pointer-events-none -z-10">
      {/* Base backdrop layer with blur */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${backdrop}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)',
          opacity: 0.5
        }}
      />
      
      {/* Dark overlay with mouse-following radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: `radial-gradient(circle ${isTouching ? '200px' : '450px'} at ${position.x}px ${position.y}px, transparent 30%, black 70%)`,
          maskImage: `radial-gradient(circle ${isTouching ? '200px' : '450px'} at ${position.x}px ${position.y}px, transparent 30%, black 70%)`,
          background: 'black'
        }}
      />
      
      {/* Clear backdrop layer with mouse-following radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${backdrop}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          WebkitMaskImage: `radial-gradient(circle ${isTouching ? '75px' : '150px'} at ${position.x}px ${position.y}px, black 30%, transparent 70%)`,
          maskImage: `radial-gradient(circle ${isTouching ? '75px' : '150px'} at ${position.x}px ${position.y}px, black 30%, transparent 70%)`
        }}
      />
    </div>
  );
} 