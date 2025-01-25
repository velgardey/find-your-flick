'use client'
import { useEffect, useState } from 'react';

export default function MouseGlow() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isTouching, setIsTouching] = useState(false);

  useEffect(() => {
    const fetchRandomMovieBackdrop = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=${Math.floor(Math.random() * 5) + 1}`
        );
        const data = await response.json();
        
        const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
        

        if (randomMovie.backdrop_path) {
          setBackgroundImage(`https://image.tmdb.org/t/p/original${randomMovie.backdrop_path}`);
        }
      } catch (error) {
        console.error('Error fetching random movie backdrop:', error);
      }
    };

    fetchRandomMovieBackdrop();
  }, []);

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

  return (
    <div className="fixed inset-0 isolate pointer-events-none">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)',
          opacity: 0.5
        }}
      />
      <div
        className="absolute inset-0 z-10"
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
        className="absolute inset-0 z-20"
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