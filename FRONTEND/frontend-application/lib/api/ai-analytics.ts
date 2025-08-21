/**
 * AI Analytics API Client
 * Handles all API calls for AI analytics data
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  // First check for admin token (for admin dashboard)
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
    console.log('[AI Analytics API] Using admin_token from localStorage');
  } else {
    // Try regular auth token (SimpleAuthProvider)
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
      console.log('[AI Analytics API] Using auth_token from localStorage');
    } else if (supabase) {
      // Fallback to Supabase session if no simple auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log('[AI Analytics API] Using token from Supabase session');
      }
    }
  }
  
  if (!config.headers.Authorization) {
    console.warn('[AI Analytics API] No auth token available');
  }
  
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't automatically redirect - let the component handle auth errors
    return Promise.reject(error);
  }
);

export interface TokenSummary {
  totalTokens: number;
  totalCost: number;
  uniqueOrganizations: number;
  averageTokensPerOrg: number;
  averageCostPerOrg: number;
  monthOverMonth: {
    currentMonthTokens: number;
    lastMonthTokens: number;
    percentageChange: number;
  };
}

export interface ConversationAnalytics {
  totalConversations: number;
  averageTokensPerConversation: number;
  modelDistribution: {
    [model: string]: {
      count: number;
      percentage: number;
      totalTokens: number;
    };
  };
}

export interface OperationAnalytics {
  operationBreakdown: {
    [operation: string]: {
      tokens: number;
      cost: number;
      percentage: number;
      requests: number;
    };
  };
  totalTokens: number;
  totalCost: number;
}

export interface PeakTimeAnalytics {
  heatmapData: Array<{
    hour: string;
    [day: string]: string | number;
  }>;
  peakHours: Array<{
    hour: number;
    avgTokens: number;
    avgRequests: number;
  }>;
}

export interface OrganizationAnalytics {
  organizations: Array<{
    id: string;
    name: string;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    avgTokensPerRequest: number;
    avgResponseTime: number;
    trend: number;
  }>;
  totalOrganizations: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DailyUsage {
  dailyUsage: Array<{
    date: string;
    tokens: number;
    cost: number;
  }>;
}

export interface MonthComparison {
  currentMonth: {
    tokens: number;
    cost: number;
  };
  lastMonth: {
    tokens: number;
    cost: number;
  };
  percentageChange: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

class AIAnalyticsAPI {
  /**
   * Get summary of token usage
   */
  async getSummary(): Promise<TokenSummary> {
    const response = await api.get('/api/admin/ai-analytics/summary');
    return response.data.data;
  }

  /**
   * Get conversation-level analytics
   */
  async getConversationAnalytics(): Promise<ConversationAnalytics> {
    const response = await api.get('/api/admin/ai-analytics/conversations');
    return response.data.data;
  }

  /**
   * Get operation-level analytics
   */
  async getOperationAnalytics(): Promise<OperationAnalytics> {
    const response = await api.get('/api/admin/ai-analytics/operations');
    return response.data.data;
  }

  /**
   * Get peak usage times
   */
  async getPeakTimes(): Promise<PeakTimeAnalytics> {
    const response = await api.get('/api/admin/ai-analytics/peak-times');
    return response.data.data;
  }

  /**
   * Get organization-level analytics
   */
  async getOrganizationAnalytics(page = 1, limit = 20): Promise<OrganizationAnalytics> {
    const response = await api.get('/api/admin/ai-analytics/organizations', {
      params: { page, limit }
    });
    return response.data.data;
  }

  /**
   * Get daily usage for date range
   */
  async getDailyUsage(startDate: string, endDate: string): Promise<DailyUsage> {
    const response = await api.get('/api/admin/ai-analytics/daily', {
      params: { startDate, endDate }
    });
    return response.data.data;
  }

  /**
   * Get month-over-month comparison
   */
  async getMonthComparison(): Promise<MonthComparison> {
    const response = await api.get('/api/admin/ai-analytics/month-comparison');
    return response.data.data;
  }

  /**
   * Track token usage (internal use)
   */
  async trackUsage(data: {
    organizationId: string;
    agentId: string;
    conversationId: string;
    userId: string;
    promptTokens: number;
    completionTokens: number;
    model: string;
    operationType: string;
    endpoint: string;
    responseTime: number;
    success: boolean;
  }): Promise<void> {
    await api.post('/api/admin/ai-analytics/track', data, {
      headers: {
        'x-service-role': 'true'
      }
    });
  }

  /**
   * Track batch usage (internal use)
   */
  async trackBatch(batch: Array<any>): Promise<void> {
    await api.post('/api/admin/ai-analytics/track-batch', { batch }, {
      headers: {
        'x-service-role': 'true'
      }
    });
  }
}

export const aiAnalyticsAPI = new AIAnalyticsAPI();