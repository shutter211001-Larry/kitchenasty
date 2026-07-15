import React, { useState, useEffect } from 'react';

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  blurClassName?: string;
}

export function ProgressiveImage({
  src,
  fallbackSrc,
  className = '',
  blurClassName = 'blur-md scale-105',
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // Derive thumbnail URL if the src is a webp uploaded by our system
  const isWebp = src?.includes('.webp');
  const thumbSrc = isWebp ? src.replace('.webp', '_thumb.webp') : null;

  useEffect(() => {
    setIsLoaded(false);
    setError(false);
    setThumbError(false);

    if (!src) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setError(true);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // If no src, or error occurred on main image, render fallback if provided
  if (!src || error) {
    if (fallbackSrc) {
      return <img src={fallbackSrc} className={className} {...props} />;
    }
    return <div className={`bg-gray-200 ${className}`} />;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Thumbnail / Placeholder */}
      {!isLoaded && (
        thumbSrc && !thumbError ? (
          <img
            src={thumbSrc}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${blurClassName}`}
            onError={() => setThumbError(true)}
            alt={props.alt || ''}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gray-200 animate-pulse" />
        )
      )}

      {/* Main High-Res Image */}
      <img
        src={src}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
}
