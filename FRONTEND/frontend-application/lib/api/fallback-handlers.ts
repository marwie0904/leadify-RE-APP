/**
 * Fallback Handlers
 * Provides fallback data when API endpoints fail
 */

import { apiConfig } from '@/lib/utils/api-config';

/**
 * Type for fallback handler functions
 */
type FallbackHandler = (error: any) => any;

/**
 * Default fallback data for critical endpoints
 */
export const fallbackHandlers: Record<string, FallbackHandler> = {
  // User profile fallback
  [apiConfig.endpoints.profile]: (error) => {
    console.warn('[Fallback] Using fallback profile data due to error:', error);
    return {
      id: 'fallback-user-id',
      email: 'user@example.com',
      name: 'User',
      role: 'agent',
      organization_id: null,
      is_human_agent: false,
    };
  },

  // Organization members fallback
  [apiConfig.endpoints.organizationMembers]: (error) => {
    console.warn('[Fallback] Using empty organization members due to error:', error);
    return [];
  },

  // Dashboard summary fallback
  [apiConfig.endpoints.dashboardSummary]: (error) => {
    console.warn('[Fallback] Using fallback dashboard data due to error:', error);
    return {
      stats: {
        totalLeads: 0,
        activeConversations: 0,
        conversionRate: 0,
        avgResponseTime: 0,
        totalAgents: 0,
        activeAgents: 0,
      },
      recentActivity: [],
      performance: {
        daily: [],
        weekly: [],
        monthly: [],
      },
    };
  },

  // Agents list fallback
  [apiConfig.endpoints.agents]: (error) => {
    console.warn('[Fallback] Using empty agents list due to error:', error);
    return [];
  },

  // Conversations list fallback
  [apiConfig.endpoints.conversations]: (error) => {
    console.warn('[Fallback] Using empty conversations list due to error:', error);
    return [];
  },

  // Leads list fallback
  [apiConfig.endpoints.leads]: (error) => {
    console.warn('[Fallback] Using empty leads list due to error:', error);
    return [];
  },

  // Human agent dashboard fallback
  [apiConfig.endpoints.humanAgentDashboard]: (error) => {
    console.warn('[Fallback] Using fallback human agent dashboard due to error:', error);
    return {
      agent: null,
      stats: {
        pendingCount: 0,
        assignedCount: 0,
        completedToday: 0,
        avgHandlingTime: 0,
      },
      pendingHandoffs: [],
      assignedConversations: [],
    };
  },

  // Priority queue fallback
  [apiConfig.endpoints.priorityQueue]: (error) => {
    console.warn('[Fallback] Using empty priority queue due to error:', error);
    return {
      conversations: [],
      pagination: {
        total: 0,
        limit: 10,
        offset: 0,
      },
    };
  },

  // Health check fallback
  [apiConfig.endpoints.health]: (error) => {
    console.warn('[Fallback] Health check failed:', error);
    return {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        api: 'down',
        database: 'unknown',
        cache: 'unknown',
      },
    };
  },
};

/**
 * Execute a function with fallback support
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  endpoint: string,
  customFallback?: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[Fallback] API call failed for ${endpoint}:`, error);

    // Use custom fallback if provided
    if (customFallback !== undefined) {
      console.log('[Fallback] Using custom fallback data');
      return customFallback;
    }

    // Look for registered fallback handler
    const handler = fallbackHandlers[endpoint];
    if (handler) {
      console.log('[Fallback] Using registered fallback handler');
      return handler(error);
    }

    // No fallback available, re-throw the error
    console.error('[Fallback] No fallback available for endpoint:', endpoint);
    throw error;
  }
}

/**
 * Register a custom fallback handler
 */
export function registerFallbackHandler(
  endpoint: string,
  handler: FallbackHandler
): void {
  fallbackHandlers[endpoint] = handler;
  console.log(`[Fallback] Registered custom handler for ${endpoint}`);
}

/**
 * Get fallback data synchronously
 */
export function getFallbackData(endpoint: string, error?: any): any {
  const handler = fallbackHandlers[endpoint];
  if (handler) {
    return handler(error);
  }
  return null;
}

/**
 * Check if fallback is available for an endpoint
 */
export function hasFallback(endpoint: string): boolean {
  return endpoint in fallbackHandlers;
}

/**
 * Fallback with notification
 */
export async function withFallbackNotification<T>(
  fn: () => Promise<T>,
  endpoint: string,
  options: {
    onFallback?: (error: any) => void;
    notificationMessage?: string;
    customFallback?: T;
  } = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Notify about fallback
    if (options.onFallback) {
      options.onFallback(error);
    }

    // Show notification to user (if toast is available)
    if (options.notificationMessage && typeof window !== 'undefined') {
      // This would integrate with your toast notification system
      console.warn('[Fallback] Notification:', options.notificationMessage);
    }

    // Use fallback
    return withFallback(
      () => Promise.reject(error),
      endpoint,
      options.customFallback
    );
  }
}

/**
 * Create a fallback wrapper for an API function
 */
export function createFallbackWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string,
  fallbackData?: Awaited<ReturnType<T>>
): T {
  return (async (...args: Parameters<T>) => {
    return withFallback(() => fn(...args), endpoint, fallbackData);
  }) as T;
}