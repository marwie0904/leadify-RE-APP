'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { generateSVGBlurDataURL, imageUtils } from '@/lib/performance/image-preloader';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width = 700,
  height = 475,
  priority = false,
  className,
  objectFit = 'cover',
  placeholder = 'blur',
  blurDataURL,
  quality = 85,
  sizes,
  fill = false,
  loading = 'lazy',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate blur placeholder if not provided
  const dataUrl = blurDataURL || generateSVGBlurDataURL(width, height);

  // Preload critical images
  useEffect(() => {
    if (priority) {
      imageUtils.preloader.preloadImage(src, { priority: 'high' });
    }
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
      >
        <svg 
          className="w-12 h-12" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  }

  const imageProps = {
    src,
    alt,
    quality,
    priority,
    placeholder: placeholder as any,
    blurDataURL: placeholder === 'blur' ? dataUrl : undefined,
    className: cn(
      'duration-700 ease-in-out transition-all',
      isLoading 
        ? 'scale-110 blur-2xl grayscale' 
        : 'scale-100 blur-0 grayscale-0',
      className
    ),
    style: { objectFit },
    onLoad: handleLoad,
    onError: handleError,
    loading: priority ? 'eager' : loading,
    sizes: sizes || imageUtils.getResponsiveSizes(),
  };

  if (fill) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Image
          {...imageProps}
          fill
          className={cn(
            'duration-700 ease-in-out transition-all',
            isLoading 
              ? 'scale-110 blur-2xl grayscale' 
              : 'scale-100 blur-0 grayscale-0'
          )}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        {...imageProps}
        width={width}
        height={height}
      />
    </div>
  );
}

// Preset configurations for common image types
export function AvatarImage({ src, alt, size = 40, className, ...props }: 
  Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      sizes={`${size}px`}
      quality={90}
      {...props}
    />
  );
}

export function HeroImage({ src, alt, className, ...props }: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1200}
      height={600}
      priority
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
      quality={90}
      {...props}
    />
  );
}

export function ThumbnailImage({ src, alt, className, ...props }: 
  Omit<OptimizedImageProps, 'width' | 'height'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={200}
      height={150}
      className={className}
      sizes="(max-width: 640px) 150px, 200px"
      quality={80}
      {...props}
    />
  );
}

export function ProductImage({ src, alt, className, ...props }: 
  Omit<OptimizedImageProps, 'width' | 'height'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={400}
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
      quality={85}
      {...props}
    />
  );
}