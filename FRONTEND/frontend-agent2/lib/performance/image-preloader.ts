/**
 * Image preloading and optimization utilities
 */

export interface ImagePreloadOptions {
  priority?: 'high' | 'low';
  sizes?: string;
  srcSet?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export class ImagePreloader {
  private static instance: ImagePreloader;
  private preloadedImages = new Set<string>();
  private imageCache = new Map<string, HTMLImageElement>();

  static getInstance(): ImagePreloader {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader();
    }
    return ImagePreloader.instance;
  }

  /**
   * Preload a single image
   */
  preloadImage(src: string, options: ImagePreloadOptions = {}): Promise<HTMLImageElement> {
    if (this.preloadedImages.has(src)) {
      const cached = this.imageCache.get(src);
      return cached ? Promise.resolve(cached) : this.loadImage(src, options);
    }

    return this.loadImage(src, options);
  }

  /**
   * Preload multiple images
   */
  preloadImages(sources: string[], options: ImagePreloadOptions = {}): Promise<HTMLImageElement[]> {
    return Promise.all(sources.map(src => this.preloadImage(src, options)));
  }

  /**
   * Add resource hint for image preloading
   */
  addResourceHint(src: string, options: ImagePreloadOptions = {}): void {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    
    if (options.srcSet) {
      link.setAttribute('imagesrcset', options.srcSet);
    }
    
    if (options.sizes) {
      link.setAttribute('imagesizes', options.sizes);
    }
    
    if (options.fetchPriority) {
      link.setAttribute('fetchpriority', options.fetchPriority);
    }
    
    document.head.appendChild(link);
    this.preloadedImages.add(src);
  }

  /**
   * Load image with options
   */
  private loadImage(src: string, options: ImagePreloadOptions): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.preloadedImages.add(src);
        this.imageCache.set(src, img);
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      if (options.srcSet) {
        img.srcset = options.srcSet;
      }
      
      if (options.sizes) {
        img.sizes = options.sizes;
      }
      
      img.src = src;
    });
  }

  /**
   * Check if image is preloaded
   */
  isPreloaded(src: string): boolean {
    return this.preloadedImages.has(src);
  }

  /**
   * Clear preload cache
   */
  clear(): void {
    this.preloadedImages.clear();
    this.imageCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.preloadedImages.size;
  }
}

/**
 * Intersection Observer for lazy image loading
 */
export class LazyImageObserver {
  private static instance: LazyImageObserver;
  private observer: IntersectionObserver;
  private imageCallbacks = new Map<Element, () => void>();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const callback = this.imageCallbacks.get(entry.target);
          if (callback) {
            callback();
            this.unobserve(entry.target);
          }
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  static getInstance(options?: IntersectionObserverInit): LazyImageObserver {
    if (!LazyImageObserver.instance) {
      LazyImageObserver.instance = new LazyImageObserver(options);
    }
    return LazyImageObserver.instance;
  }

  observe(element: Element, callback: () => void): void {
    this.imageCallbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.imageCallbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.imageCallbacks.clear();
  }
}

/**
 * Generate blur placeholder for images
 */
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f6f7f8');
  gradient.addColorStop(0.5, '#edeef1');
  gradient.addColorStop(1, '#f6f7f8');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
}

/**
 * Generate SVG blur placeholder
 */
export function generateSVGBlurDataURL(width: number, height: number): string {
  const svg = `
    <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f6f7f8" offset="20%" />
          <stop stop-color="#edeef1" offset="50%" />
          <stop stop-color="#f6f7f8" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#f6f7f8" />
      <rect id="r" width="${width}" height="${height}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${width}" to="${width}" dur="1s" repeatCount="indefinite" />
    </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Utility functions for image optimization
 */
export const imageUtils = {
  preloader: ImagePreloader.getInstance(),
  observer: LazyImageObserver.getInstance(),
  
  // Common image sizes for responsive images
  getResponsiveSizes: (breakpoints?: { sm?: number; md?: number; lg?: number; xl?: number }) => {
    const bp = { sm: 640, md: 768, lg: 1024, xl: 1280, ...breakpoints };
    return `(max-width: ${bp.sm}px) 100vw, (max-width: ${bp.md}px) 50vw, (max-width: ${bp.lg}px) 33vw, 25vw`;
  },
  
  // Generate srcSet for responsive images
  generateSrcSet: (baseUrl: string, widths: number[]) => {
    return widths.map(width => `${baseUrl}?w=${width} ${width}w`).join(', ');
  },
  
  // Optimize image URL with parameters
  optimizeImageUrl: (url: string, options: { width?: number; height?: number; quality?: number; format?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    
    const separator = url.includes('?') ? '&' : '?';
    return params.toString() ? `${url}${separator}${params.toString()}` : url;
  }
};