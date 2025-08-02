'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCSRFReturn {
  token: string | null;
  loading: boolean;
  error: Error | null;
  refreshToken: () => Promise<string | null>;
  addToHeaders: (headers?: HeadersInit) => HeadersInit;
}

/**
 * Custom hook for CSRF token management
 * Handles fetching, refreshing, and including CSRF tokens in requests
 */
export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  /**
   * Fetch CSRF token from the API
   */
  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received from server');
      }
      
      setToken(data.token);
      
      // Check if we should schedule a refresh
      if (data.expiresAt) {
        const expiresAt = new Date(data.expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh 5 minutes before expiry
        const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
        
        if (refreshTime > 0) {
          setTimeout(() => {
            refreshToken();
          }, refreshTime);
        }
      }
      
      return data.token;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Failed to fetch CSRF token:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh the CSRF token
   * Deduplicates concurrent refresh requests
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    // If a refresh is already in progress, return that promise
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Create new refresh promise
    refreshPromiseRef.current = fetchToken();
    
    try {
      const newToken = await refreshPromiseRef.current;
      return newToken;
    } finally {
      // Clear the promise ref after completion
      refreshPromiseRef.current = null;
    }
  }, [fetchToken]);

  /**
   * Helper function to add CSRF token to headers
   */
  const addToHeaders = useCallback((headers?: HeadersInit): HeadersInit => {
    if (!token) {
      console.warn('No CSRF token available');
      return headers || {};
    }

    if (headers instanceof Headers) {
      const newHeaders = new Headers(headers);
      newHeaders.set('X-CSRF-Token', token);
      return newHeaders;
    }

    if (Array.isArray(headers)) {
      return [...headers, ['X-CSRF-Token', token]];
    }

    return {
      ...headers,
      'X-CSRF-Token': token,
    };
  }, [token]);

  // Fetch token on mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Listen for CSRF refresh events
  useEffect(() => {
    const handleCSRFRefresh = (event: CustomEvent) => {
      if (event.detail?.shouldRefresh) {
        refreshToken();
      }
    };

    window.addEventListener('csrf:refresh', handleCSRFRefresh as EventListener);
    
    return () => {
      window.removeEventListener('csrf:refresh', handleCSRFRefresh as EventListener);
    };
  }, [refreshToken]);

  // Handle visibility change - refresh token if page becomes visible after being hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading && !error) {
        // Check if token might be stale (page was hidden for more than 30 minutes)
        const hiddenDuration = Date.now() - (document as any).hiddenTimestamp || 0;
        if (hiddenDuration > 30 * 60 * 1000) {
          refreshToken();
        }
      } else if (document.visibilityState === 'hidden') {
        // Store timestamp when page becomes hidden
        (document as any).hiddenTimestamp = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loading, error, refreshToken]);

  return {
    token,
    loading,
    error,
    refreshToken,
    addToHeaders,
  };
}

/**
 * Helper hook for forms that need CSRF protection
 */
export function useCSRFForm() {
  const { token, loading, error, refreshToken, addToHeaders } = useCSRF();

  const getFormData = useCallback((data: Record<string, any>) => {
    if (!token) {
      throw new Error('CSRF token not available');
    }

    return {
      ...data,
      csrfToken: token,
    };
  }, [token]);

  const submitForm = useCallback(async (
    url: string,
    data: Record<string, any>,
    options: RequestInit = {}
  ) => {
    if (!token) {
      throw new Error('CSRF token not available');
    }

    const response = await fetch(url, {
      ...options,
      method: options.method || 'POST',
      headers: addToHeaders({
        'Content-Type': 'application/json',
        ...options.headers,
      }),
      body: JSON.stringify(getFormData(data)),
      credentials: 'include',
    });

    // Check if token needs refresh
    if (response.headers.get('X-CSRF-Refresh') === 'true') {
      await refreshToken();
    }

    return response;
  }, [token, addToHeaders, getFormData, refreshToken]);

  return {
    token,
    loading,
    error,
    getFormData,
    submitForm,
    refreshToken,
  };
}