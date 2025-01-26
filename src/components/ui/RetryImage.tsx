'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface RetryImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackText?: string;
}

export default function RetryImage({
  src,
  alt,
  fill = true,
  className = '',
  sizes = '100vw',
  quality = 85,
  priority = false,
  maxRetries = 3,
  retryDelay = 2000,
  fallbackText = 'Image not available'
}: RetryImageProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [imageKey, setImageKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset states when src changes
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
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading...</div>
        </div>
      )}
      
      <Image
        key={imageKey}
        src={src}
        alt={alt}
        fill={fill}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        sizes={sizes}
        quality={quality}
        priority={priority}
        onError={handleError}
        onLoad={handleLoad}
      />

      {hasError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-sm text-gray-400 text-center px-2">
            Retrying... ({retryCount + 1}/{maxRetries})
          </div>
        </div>
      )}

      {!isLoading && hasError && retryCount >= maxRetries && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-sm text-gray-400 text-center px-2">{fallbackText}</div>
        </div>
      )}
    </div>
  );
} 