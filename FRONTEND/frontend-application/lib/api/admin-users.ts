/**
 * Admin Users API Client
 * Handles all admin user management operations
 */

import { config } from '@/lib/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface User {
  id: string;
  name: string;
  email: string;
  organization: string;
  organizationId?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  joinDate: string;
  lastActive: string;
  leadsCount: number;
  conversationsCount: number;
  suspendedAt?: string;
  suspensionReason?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  totalOrganizations: number;
}

export interface UsersResponse {
  success: boolean;
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UsersFilters {
  search?: string;
  organization?: string;
  status?: 'all' | 'active' | 'inactive' | 'suspended';
  page?: number;
  limit?: number;
}

class AdminUsersAPI {
  private baseUrl = `${config.API_URL}/api/admin/users`;

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    console.log('[AdminUsersAPI] Making request to:', `${this.baseUrl}${endpoint}`);
    
    let token: string | null = null;
    
    // First check for admin token (for admin dashboard)
    token = localStorage.getItem('admin_token');
    if (token) {
      console.log('[AdminUsersAPI] Using admin_token from localStorage');
    } else {
      // Try to get the current session from Supabase if available
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AdminUsersAPI] Supabase session exists:', !!session);
        
        if (session?.access_token) {
          token = session.access_token;
          console.log('[AdminUsersAPI] Using Supabase token');
        }
      }
      
      // Fallback to localStorage for simple auth
      if (!token) {
        token = localStorage.getItem('auth_token');
        console.log('[AdminUsersAPI] Using auth_token from localStorage:', !!token);
        
        if (!token) {
          throw new Error('No authentication token found');
        }
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log('[AdminUsersAPI] Response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[AdminUsersAPI] API Error:', error);
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    // Handle CSV export specially
    if (response.headers.get('content-type')?.includes('text/csv')) {
      return response.blob();
    }

    const data = await response.json();
    console.log('[AdminUsersAPI] Response data:', data);
    return data;
  }

  /**
   * Fetch paginated list of users with filters
   */
  async getUsers(filters: UsersFilters = {}): Promise<UsersResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.organization && filters.organization !== 'all') {
      params.append('organization', filters.organization);
    }
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 10));

    const queryString = params.toString();
    return this.makeRequest(queryString ? `?${queryString}` : '');
  }

  /**
   * Get user statistics for dashboard cards
   */
  async getStats(): Promise<UserStats> {
    console.log('[AdminUsersAPI] Fetching stats...');
    const result = await this.makeRequest('/stats');
    console.log('[AdminUsersAPI] Stats response:', result);
    return result;
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Reactivate a suspended user
   */
  async reactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/${userId}/reactivate`, {
      method: 'POST',
    });
  }

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Send email to a user
   */
  async sendEmail(
    userId: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/${userId}/email`, {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    });
  }

  /**
   * Export users as CSV
   */
  async exportUsers(format: 'csv' | 'json' = 'csv'): Promise<Blob | any> {
    const response = await this.makeRequest(`/export?format=${format}`);
    
    if (format === 'csv') {
      // Create a download link
      const url = window.URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return response;
    }
    
    return response;
  }
}

export const adminUsersAPI = new AdminUsersAPI();