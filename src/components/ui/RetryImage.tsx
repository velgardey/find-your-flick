'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface RetryImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackSrc?: string;
  fallbackText?: string;
}

export default function RetryImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  sizes = '100vw',
  quality = 85,
  priority = false,
  maxRetries = 3,
  retryDelay = 1000,
  fallbackSrc = '/default-avatar.png',
  fallbackText = 'Image not available'
}: RetryImageProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [imageKey, setImageKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
    setImageKey(prev => prev + 1);
  }, [src]);

  const handleError = () => {
    setIsLoading(false);
    if (retryCount < maxRetries) {
      setHasError(true);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageKey(prev => prev + 1);
        setIsLoading(true);
        setHasError(false);
      }, retryDelay);
    } else {
      setCurrentSrc(fallbackSrc);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  return (
    <div className={`relative ${!fill ? 'inline-block' : 'w-full h-full'}`}>
      {isLoading && (
        <div className={`${fill ? 'absolute inset-0' : ''} bg-white/5 animate-pulse flex items-center justify-center`} 
             style={{ width: width, height: height }}>
          <div className="text-sm text-gray-400">Loading...</div>
        </div>
      )}
      
      <Image
        key={imageKey}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        sizes={sizes}
        quality={quality}
        priority={priority}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized={true}
      />

      {hasError && retryCount < maxRetries && (
        <div className={`${fill ? 'absolute inset-0' : ''} bg-gray-800 flex items-center justify-center`}
             style={{ width: width, height: height }}>
          <div className="text-sm text-gray-400 text-center px-2">
            Retrying... ({retryCount + 1}/{maxRetries})
          </div>
        </div>
      )}

      {hasError && retryCount >= maxRetries && (
        <div className={`${fill ? 'absolute inset-0' : ''} bg-gray-800 flex items-center justify-center`}
             style={{ width: width, height: height }}>
          <div className="text-sm text-gray-400 text-center px-2">
            {fallbackText}
          </div>
        </div>
      )}
    </div>
  );
} 