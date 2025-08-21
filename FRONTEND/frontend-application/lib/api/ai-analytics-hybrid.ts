/**
 * Hybrid AI Analytics API Client
 * Works with both Supabase and Simple Auth systems
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

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests - check both auth systems
api.interceptors.request.use(async (config) => {
  // First try to get token from localStorage (simple-auth)
  const simpleAuthToken = localStorage.getItem('auth_token');
  if (simpleAuthToken) {
    console.log('[AI Analytics] Using simple auth token');
    config.headers.Authorization = `Bearer ${simpleAuthToken}`;
    return config;
  }

  // Check for Supabase session in localStorage
  // The key format is: sb-[project-ref]-auth-token
  const storageKeys = Object.keys(localStorage);
  const supabaseKey = storageKeys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
  
  if (supabaseKey) {
    try {
      const authData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
      if (authData.access_token) {
        console.log('[AI Analytics] Using Supabase token from localStorage');
        config.headers.Authorization = `Bearer ${authData.access_token}`;
        return config;
      }
    } catch (e) {
      console.error('[AI Analytics] Error parsing Supabase auth data:', e);
    }
  }

  // If no localStorage token, try Supabase client
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('[AI Analytics] Using Supabase token from client');
      config.headers.Authorization = `Bearer ${session.access_token}`;
      return config;
    }
  }

  console.log('[AI Analytics] No auth token found');
  return config;
});

// Don't auto-redirect on errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[AI Analytics] API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Export all the same types and functions from the original
export * from './ai-analytics';

// Override the API functions to use our hybrid client
export const aiAnalyticsAPI = {
  getSummary: async () => {
    const response = await api.get('/api/admin/ai-analytics/summary');
    return response.data.data;
  },

  getConversationAnalytics: async () => {
    const response = await api.get('/api/admin/ai-analytics/conversations');
    return response.data.data;
  },

  getOperationAnalytics: async () => {
    const response = await api.get('/api/admin/ai-analytics/operations');
    return response.data.data;
  },

  getPeakTimes: async () => {
    const response = await api.get('/api/admin/ai-analytics/peak-times');
    return response.data.data;
  },

  getOrganizationAnalytics: async (page = 1, limit = 10) => {
    const response = await api.get('/api/admin/ai-analytics/organizations', {
      params: { page, limit }
    });
    return response.data.data;
  },

  getDailyUsage: async (startDate: string, endDate: string) => {
    const response = await api.get('/api/admin/ai-analytics/daily', {
      params: { startDate, endDate }
    });
    return response.data.data;
  },

  getMonthComparison: async () => {
    const response = await api.get('/api/admin/ai-analytics/month-comparison');
    return response.data.data;
  }
};