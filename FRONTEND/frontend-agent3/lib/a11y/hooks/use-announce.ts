import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { AnnouncementPriority, AnnouncementOptions, AccessibilityError, AccessibilityErrorCode } from '../core/types';
import { getAnnouncer, AnnouncementEngine } from '../screen-reader/announcer';
import { useAccessibility } from './use-accessibility';

export interface UseAnnounceOptions {
  /**
   * Default priority for announcements
   */
  defaultPriority?: AnnouncementPriority;
  
  /**
   * Default delay for announcements
   */
  defaultDelay?: number;
  
  /**
   * Whether to automatically announce errors
   */
  autoErrorAnnouncement?: boolean;
  
  /**
   * Whether to enable verbose announcements
   */
  verboseAnnouncements?: boolean;
}

export interface UseAnnounceReturn {
  /**
   * Generic announce function with full options
   */
  announce: (message: string, options?: AnnouncementOptions) => Promise<void>;
  
  /**
   * Announce with polite priority
   */
  announcePolite: (message: string, options?: Omit<AnnouncementOptions, 'priority'>) => Promise<void>;
  
  /**
   * Announce with assertive priority
   */
  announceAssertive: (message: string, options?: Omit<AnnouncementOptions, 'priority'>) => Promise<void>;
  
  /**
   * Announce status message (polite, non-persistent)
   */
  announceStatus: (message: string, options?: Omit<AnnouncementOptions, 'priority' | 'persist'>) => Promise<void>;
  
  /**
   * Announce error message (assertive, clears queue, persistent)
   */
  announceError: (message: string, options?: Omit<AnnouncementOptions, 'priority' | 'clearQueue' | 'persist'>) => Promise<void>;
  
  /**
   * Clear all pending announcements
   */
  clear: () => void;
  
  /**
   * Pause announcement processing
   */
  pause: () => void;
  
  /**
   * Resume announcement processing
   */
  resume: () => void;
  
  /**
   * Whether any announcements are currently being processed
   */
  isAnnouncing: boolean;
  
  /**
   * Number of pending announcements in queue
   */
  queueLength: number;
}

/**
 * Custom hook for screen reader announcements
 * Provides convenient methods for different types of announcements
 */
export function useAnnounce(hookOptions: UseAnnounceOptions = {}): UseAnnounceReturn {
  const announcerRef = useRef<AnnouncementEngine | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const pendingAnnouncementsRef = useRef(new Set<Promise<void>>());
  
  // Use ref for synchronous state and derive isAnnouncing from it
  const isAnnouncingRef = useRef(false);
  const [reRenderTrigger, setReRenderTrigger] = useState(0);
  
  const { getPreference } = useAccessibility();

  // Keep references to event handlers for cleanup
  const handleAnnouncedRef = useRef<() => void>();
  const handleClearedRef = useRef<() => void>();

  // Initialize announcer
  useEffect(() => {
    try {
      if (!announcerRef.current) {
        announcerRef.current = getAnnouncer();
        
        // Create event handlers
        const handleAnnounced = () => {
          if (announcerRef.current) {
            const queue = announcerRef.current.getAnnouncementQueue();
            setQueueLength(queue.length);
          }
        };

        const handleCleared = () => {
          setQueueLength(0);
        };

        // Store references for cleanup
        handleAnnouncedRef.current = handleAnnounced;
        handleClearedRef.current = handleCleared;

        // Listen for announcement events to update state
        announcerRef.current.on('announced', handleAnnounced);
        announcerRef.current.on('cleared', handleCleared);
      }
    } catch (error) {
      console.warn('Failed to initialize announcement engine:', error);
    }

    // Cleanup on unmount
    return () => {
      if (announcerRef.current) {
        try {
          if (handleAnnouncedRef.current) {
            announcerRef.current.off('announced', handleAnnouncedRef.current);
          }
          if (handleClearedRef.current) {
            announcerRef.current.off('cleared', handleClearedRef.current);
          }
          announcerRef.current.destroy();
        } catch (error) {
          console.warn('Failed to cleanup announcement engine:', error);
        }
        announcerRef.current = null;
      }
    };
  }, []);

  // Get accessibility preferences with fallbacks
  const getAnnouncementDelay = useCallback((): number => {
    try {
      return getPreference('announcementDelay') || hookOptions.defaultDelay || 150;
    } catch (error) {
      console.warn('Failed to get announcement delay preference:', error);
      return hookOptions.defaultDelay || 150;
    }
  }, [getPreference, hookOptions.defaultDelay]);

  const isVerboseAnnouncements = useCallback((): boolean => {
    try {
      return hookOptions.verboseAnnouncements ?? 
             getPreference('verboseAnnouncements') ?? 
             false;
    } catch (error) {
      console.warn('Failed to get verbose announcements preference:', error);
      return hookOptions.verboseAnnouncements ?? false;
    }
  }, [getPreference, hookOptions.verboseAnnouncements]);

  // Track pending announcements to update isAnnouncing state
  const trackAnnouncement = useCallback((promise: Promise<void>): Promise<void> => {
    // Update ref synchronously
    isAnnouncingRef.current = true;
    pendingAnnouncementsRef.current.add(promise);
    // Force re-render to update component
    setReRenderTrigger(prev => prev + 1);

    const cleanup = () => {
      pendingAnnouncementsRef.current.delete(promise);
      if (pendingAnnouncementsRef.current.size === 0) {
        isAnnouncingRef.current = false;
        setReRenderTrigger(prev => prev + 1);
      }
    };

    promise.then(cleanup).catch(cleanup);
    return promise;
  }, []);

  // Generic announce function
  const announce = useCallback(async (
    message: string, 
    options: AnnouncementOptions = {}
  ): Promise<void> => {
    if (!message || message.trim() === '') {
      throw new AccessibilityError(
        'Message cannot be empty',
        AccessibilityErrorCode.INVALID_MESSAGE
      );
    }

    if (!announcerRef.current) {
      // Try to initialize announcer if it's not available
      try {
        announcerRef.current = getAnnouncer();
      } catch (error) {
        throw new AccessibilityError(
          'Announcement engine not available',
          AccessibilityErrorCode.ANNOUNCEMENT_FAILED
        );
      }
    }

    // Merge options with defaults
    const finalOptions: AnnouncementOptions = {
      priority: hookOptions.defaultPriority || 'polite',
      delay: getAnnouncementDelay(),
      ...options,
    };

    // Create and track the announcement promise
    const announcementPromise = announcerRef.current.announce(message, finalOptions);
    return trackAnnouncement(announcementPromise);
  }, [getAnnouncementDelay, hookOptions.defaultPriority, trackAnnouncement]);

  // Convenience methods
  const announcePolite = useCallback(async (
    message: string, 
    options: Omit<AnnouncementOptions, 'priority'> = {}
  ): Promise<void> => {
    return announce(message, { ...options, priority: 'polite' });
  }, [announce]);

  const announceAssertive = useCallback(async (
    message: string, 
    options: Omit<AnnouncementOptions, 'priority'> = {}
  ): Promise<void> => {
    return announce(message, { 
      clearQueue: true, 
      ...options, 
      priority: 'assertive' 
    });
  }, [announce]);

  const announceStatus = useCallback(async (
    message: string, 
    options: Omit<AnnouncementOptions, 'priority' | 'persist'> = {}
  ): Promise<void> => {
    return announce(message, { 
      ...options, 
      priority: 'polite', 
      persist: false 
    });
  }, [announce]);

  const announceError = useCallback(async (
    message: string, 
    options: Omit<AnnouncementOptions, 'priority' | 'clearQueue' | 'persist'> = {}
  ): Promise<void> => {
    return announce(message, { 
      ...options, 
      priority: 'assertive', 
      clearQueue: true, 
      persist: true 
    });
  }, [announce]);

  // Queue management functions
  const clear = useCallback((): void => {
    try {
      if (!announcerRef.current) {
        announcerRef.current = getAnnouncer();
      }
      
      announcerRef.current.clear();
      setQueueLength(0);
      // Clear pending announcements tracking
      pendingAnnouncementsRef.current.clear();
      isAnnouncingRef.current = false;
      setReRenderTrigger(prev => prev + 1);
    } catch (error) {
      console.warn('Failed to clear announcement queue:', error);
      // Still update local state
      setQueueLength(0);
      pendingAnnouncementsRef.current.clear();
      isAnnouncingRef.current = false;
      setReRenderTrigger(prev => prev + 1);
    }
  }, []);

  const pause = useCallback((): void => {
    try {
      if (!announcerRef.current) {
        announcerRef.current = getAnnouncer();
      }
      
      announcerRef.current.pause();
    } catch (error) {
      console.warn('Failed to pause announcements:', error);
    }
  }, []);

  const resume = useCallback((): void => {
    try {
      if (!announcerRef.current) {
        announcerRef.current = getAnnouncer();
      }
      
      announcerRef.current.resume();
    } catch (error) {
      console.warn('Failed to resume announcements:', error);
    }
  }, []);

  // Update queue length periodically
  useEffect(() => {
    const updateQueueLength = () => {
      try {
        if (!announcerRef.current) {
          announcerRef.current = getAnnouncer();
        }
        
        const queue = announcerRef.current.getAnnouncementQueue();
        setQueueLength(queue.length);
      } catch (error) {
        // Silently fail for periodic updates - the announcer might not be ready yet
        setQueueLength(0);
      }
    };

    const interval = setInterval(updateQueueLength, 100);
    updateQueueLength(); // Initial update

    return () => clearInterval(interval);
  }, []);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(() => ({
    announce,
    announcePolite,
    announceAssertive,
    announceStatus,
    announceError,
    clear,
    pause,
    resume,
    isAnnouncing: isAnnouncingRef.current,
    queueLength,
  }), [
    announce,
    announcePolite,
    announceAssertive,
    announceStatus,
    announceError,
    clear,
    pause,
    resume,
    queueLength,
    reRenderTrigger,
  ]);
}

/**
 * Simple hook variant for basic announcements
 */
export function useAnnounceSimple(): {
  announce: (message: string, priority?: AnnouncementPriority) => Promise<void>;
  clear: () => void;
} {
  const { announce, clear } = useAnnounce();

  const simpleAnnounce = useCallback(async (
    message: string, 
    priority: AnnouncementPriority = 'polite'
  ): Promise<void> => {
    return announce(message, { priority });
  }, [announce]);

  return useMemo(() => ({
    announce: simpleAnnounce,
    clear,
  }), [simpleAnnounce, clear]);
}

/**
 * Hook variant specifically for status announcements
 */
export function useAnnounceStatus(): {
  announceStatus: (message: string) => Promise<void>;
  announceError: (message: string) => Promise<void>;
  isAnnouncing: boolean;
} {
  const { announceStatus, announceError, isAnnouncing } = useAnnounce();

  return useMemo(() => ({
    announceStatus,
    announceError,
    isAnnouncing,
  }), [announceStatus, announceError, isAnnouncing]);
}