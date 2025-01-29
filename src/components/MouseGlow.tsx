'use client'
import { useEffect, useState } from 'react';

interface MouseGlowProps {
  onMediaChange?: (mediaId: number, mediaType: 'movie' | 'tv') => void;
}

export default function MouseGlow({ onMediaChange }: MouseGlowProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isTouching, setIsTouching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Clear any previous session data
    localStorage.removeItem('session_backdrop');
    localStorage.removeItem('session_media_info');

    let isMounted = true;

    const fetchRandomMedia = async () => {
      setIsLoading(true);
      try {
        const isMovie = Math.random() > 0.5;
        const response = await fetch(
          `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/popular?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=${Math.floor(Math.random() * 5) + 1}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch random ${isMovie ? 'movie' : 'TV show'} backdrop`);
        }

        const data = await response.json();
        const randomMedia = data.results[Math.floor(Math.random() * data.results.length)];
        
        if (randomMedia.backdrop_path && isMounted) {
          const backdropUrl = `https://image.tmdb.org/t/p/original${randomMedia.backdrop_path}`;
          
          // Preload the image before showing it
          const img = new Image();
          img.onload = () => {
            if (isMounted) {
              setBackgroundImage(backdropUrl);
              setIsLoading(false);
              // Store the backdrop URL and media info in localStorage
              localStorage.setItem('session_backdrop', backdropUrl);
              localStorage.setItem('session_media_info', JSON.stringify({
                id: randomMedia.id,
                type: isMovie ? 'movie' : 'tv'
              }));
              onMediaChange?.(randomMedia.id, isMovie ? 'movie' : 'tv');
            }
          };
          img.src = backdropUrl;
        }
      } catch (error) {
        console.error('Error fetching random media backdrop:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRandomMedia();

    return () => {
      isMounted = false;
    };
  }, [onMediaChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      setIsTouching(true);
      setPosition({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
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
  }, []);

  if (isLoading || !backgroundImage) {
    return (
      <div className="fixed inset-0 isolate pointer-events-none -z-10 bg-black" />
    );
  }

  return (
    <div className="fixed inset-0 isolate pointer-events-none -z-10">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)',
          opacity: 0.5
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: `radial-gradient(circle ${isTouching ? '200px' : '450px'} at ${position.x}px ${position.y}px, 
            transparent 30%,
            black 70%)`,
          maskImage: `radial-gradient(circle ${isTouching ? '200px' : '450px'} at ${position.x}px ${position.y}px, 
            transparent 30%,
            black 70%)`,
          background: 'black'
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          WebkitMaskImage: `radial-gradient(circle ${isTouching ? '75px' : '150px'} at ${position.x}px ${position.y}px, 
            black 30%,
            transparent 70%)`,
          maskImage: `radial-gradient(circle ${isTouching ? '75px' : '150px'} at ${position.x}px ${position.y}px, 
            black 30%,
            transparent 70%)`,
        }}
      />
    </div>
  );
} 