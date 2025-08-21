'use client'

import { toast } from 'sonner'
import { config } from '@/lib/config'
import { createClient } from '@supabase/supabase-js'

export interface NotificationData {
  id: string
  userId: string
  type: 'lead_created' | 'lead_qualified' | 'conversation_started' | 'system_announcement' | 'marketing'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical'
  read: boolean
  readAt: string | null
  data?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  types: {
    lead_created: { email: boolean; push: boolean; inApp: boolean }
    lead_qualified: { email: boolean; push: boolean; inApp: boolean }
    conversation_started: { email: boolean; push: boolean; inApp: boolean }
    system_announcement: { email: boolean; push: boolean; inApp: boolean }
    marketing: { email: boolean; push: boolean; inApp: boolean }
  }
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  byPriority: Record<string, number>
  last7Days: Array<{ date: string; count: number }>
  last30Days: Array<{ date: string; count: number }>
}

// Request deduplication for notification service
const notificationRequestCache = new Map<string, Promise<any>>();
const notificationDataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const NOTIFICATION_CACHE_TTL = {
  NOTIFICATIONS: 10 * 1000, // 10 seconds for notifications list
  PREFERENCES: 60 * 1000, // 1 minute for preferences
  STATS: 30 * 1000, // 30 seconds for stats
};

/**
 * Notification-specific request deduplication
 */
async function dedupedNotificationRequest<T>(
  cacheKey: string,
  requestFn: () => Promise<T>,
  ttl: number = 10000
): Promise<T> {
  // Check cached result
  const cached = notificationDataCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    console.log(`[NotificationService] Using cached data for: ${cacheKey}`);
    return cached.data;
  }

  // Check if request is in progress
  if (notificationRequestCache.has(cacheKey)) {
    console.log(`[NotificationService] Deduplicating request for: ${cacheKey}`);
    return notificationRequestCache.get(cacheKey)!;
  }

  // Create new request
  const requestPromise = requestFn().then((data) => {
    notificationDataCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
    notificationRequestCache.delete(cacheKey);
    return data;
  }).catch((error) => {
    notificationRequestCache.delete(cacheKey);
    throw error;
  });

  notificationRequestCache.set(cacheKey, requestPromise);
  return requestPromise;
}

class NotificationService {
  private subscription: any = null
  private supabase: any = null
  private baseUrl: string
  private authHeaders: () => Promise<Record<string, string>>
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  constructor() {
    this.baseUrl = config.API_URL
    console.log('[NotificationService] Using API URL:', this.baseUrl)
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  // Initialize with auth headers function
  initialize(authHeadersProvider: () => Promise<Record<string, string>>) {
    this.authHeaders = authHeadersProvider
  }

  // Event listener management
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data))
  }

  // Supabase Realtime Connection Management
  async startRealtimeConnection() {
    if (this.subscription) {
      this.supabase.removeChannel(this.subscription)
    }

    try {
      console.log('[NotificationService] Starting Supabase Realtime connection')
      
      // Get current user from auth headers to filter notifications
      const headers = await this.authHeaders()
      const token = headers.Authorization?.replace('Bearer ', '')
      
      // Set Supabase auth token for RLS
      if (token) {
        await this.supabase.auth.setSession({
          access_token: token,
          refresh_token: '' // We'll handle refresh separately
        })
      }

      // Create realtime subscription for notifications
      const channel = this.supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          (payload: any) => {
            console.log('[NotificationService] New notification received via Realtime:', payload)
            
            if (payload.new) {
              const notification: NotificationData = {
                id: payload.new.id,
                userId: payload.new.user_id,
                type: payload.new.type,
                title: payload.new.title,
                message: payload.new.message,
                priority: payload.new.priority,
                read: payload.new.read || false,
                readAt: payload.new.read_at,
                data: payload.new.data,
                createdAt: payload.new.created_at,
                updatedAt: payload.new.updated_at
              }
              
              this.emit('notification', notification)
              this.showToastNotification(notification)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications'
          },
          (payload: any) => {
            console.log('[NotificationService] Notification updated via Realtime:', payload)
            this.emit('notification-updated', payload.new)
          }
        )
        .subscribe((status) => {
          console.log('[NotificationService] Realtime subscription status:', status)
          
          if (status === 'SUBSCRIBED') {
            this.emit('connected', { connected: true })
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.emit('error', { status })
            
            // Reconnect after delay
            setTimeout(() => {
              this.startRealtimeConnection()
            }, 5000)
          }
        })

      this.subscription = channel

    } catch (error) {
      console.error('[NotificationService] Failed to start Realtime connection:', error)
      throw error
    }
  }

  stopRealtimeConnection() {
    if (this.subscription) {
      this.supabase.removeChannel(this.subscription)
      this.subscription = null
      this.emit('disconnected', { connected: false })
    }
  }

  private showToastNotification(notification: NotificationData) {
    const priorityColors = {
      low: 'info',
      medium: 'info', 
      high: 'warning',
      urgent: 'warning',
      critical: 'error'
    } as const

    const toastType = priorityColors[notification.priority] || 'info'

    if (toastType === 'error') {
      toast.error(notification.title, {
        description: notification.message,
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => this.emit('notification-clicked', notification)
        }
      })
    } else if (toastType === 'warning') {
      toast.warning(notification.title, {
        description: notification.message,
        duration: 7000,
        action: {
          label: 'View',
          onClick: () => this.emit('notification-clicked', notification)
        }
      })
    } else {
      toast.success(notification.title, {
        description: notification.message,
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => this.emit('notification-clicked', notification)
        }
      })
    }
  }

  // API Methods
  async getNotifications(params?: {
    page?: number
    limit?: number
    read?: boolean
    type?: string
    priority?: string
  }): Promise<{
    notifications: NotificationData[]
    totalCount: number
    unreadCount: number
    hasMore: boolean
  }> {
    // Create cache key based on parameters
    const cacheKey = `notifications-${JSON.stringify(params || {})}`;
    
    return dedupedNotificationRequest(
      cacheKey,
      async () => {
        const headers = await this.authHeaders()
        const searchParams = new URLSearchParams()
        
        if (params?.page) searchParams.append('page', params.page.toString())
        if (params?.limit) searchParams.append('limit', params.limit.toString())
        if (params?.read !== undefined) searchParams.append('read', params.read.toString())
        if (params?.type) searchParams.append('type', params.type)
        if (params?.priority) searchParams.append('priority', params.priority)

        const response = await fetch(
          `${this.baseUrl}/api/notifications?${searchParams}`,
          { headers }
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch notifications: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Transform API response to match frontend expectations
        if (data.success && Array.isArray(data.data)) {
          return {
            notifications: data.data,
            unreadCount: data.unread_count || 0,
            totalCount: data.total || 0,
            hasMore: false
          }
        }
        
        return data.data || data
      },
      NOTIFICATION_CACHE_TTL.NOTIFICATIONS
    );
  }

  async markAsRead(notificationId: string): Promise<NotificationData> {
    try {
      const headers = await this.authHeaders()
      const response = await fetch(
        `${this.baseUrl}/api/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.statusText}`)
      }

      const data = await response.json()
      this.emit('notification-read', data.data?.notification || data.notification)
      return data.data?.notification || data.notification
    } catch (error) {
      console.error('[NotificationService] Failed to mark notification as read:', error)
      throw error
    }
  }

  async markAllAsRead(): Promise<{ updated: number }> {
    try {
      const headers = await this.authHeaders()
      const response = await fetch(
        `${this.baseUrl}/api/notifications/read-all`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${response.statusText}`)
      }

      const data = await response.json()
      this.emit('all-notifications-read', data.data || data)
      return data.data || data
    } catch (error) {
      console.error('[NotificationService] Failed to mark all notifications as read:', error)
      throw error
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const headers = await this.authHeaders()
      const response = await fetch(
        `${this.baseUrl}/api/notifications/${notificationId}`,
        {
          method: 'DELETE',
          headers
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.statusText}`)
      }

      this.emit('notification-deleted', { id: notificationId })
    } catch (error) {
      console.error('[NotificationService] Failed to delete notification:', error)
      throw error
    }
  }

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const headers = await this.authHeaders()
      const response = await fetch(
        `${this.baseUrl}/api/notifications/preferences`,
        { headers }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.statusText}`)
      }

      const data = await response.json()
      const backendPrefs = data.preferences || data.data?.preferences || {}
      
      // Transform backend format to frontend format
      const transformed: NotificationPreferences = {
        email: backendPrefs.emailEnabled ?? true,
        push: backendPrefs.pushEnabled ?? false,
        inApp: backendPrefs.inAppEnabled ?? true,
        types: {
          lead_created: {
            email: backendPrefs.preferences?.lead_created ?? true,
            push: backendPrefs.preferences?.lead_created ?? false,
            inApp: backendPrefs.preferences?.lead_created ?? true
          },
          lead_qualified: {
            email: backendPrefs.preferences?.lead_qualified ?? true,
            push: backendPrefs.preferences?.lead_qualified ?? true,
            inApp: backendPrefs.preferences?.lead_qualified ?? true
          },
          conversation_started: {
            email: backendPrefs.preferences?.conversation_started ?? false,
            push: backendPrefs.preferences?.conversation_started ?? true,
            inApp: backendPrefs.preferences?.conversation_started ?? true
          },
          system_announcement: {
            email: backendPrefs.preferences?.system_announcement ?? true,
            push: backendPrefs.preferences?.system_announcement ?? true,
            inApp: backendPrefs.preferences?.system_announcement ?? true
          },
          marketing: {
            email: backendPrefs.preferences?.marketing ?? false,
            push: backendPrefs.preferences?.marketing ?? false,
            inApp: backendPrefs.preferences?.marketing ?? true
          }
        }
      }
      
      return transformed
    } catch (error) {
      console.error('[NotificationService] Failed to fetch preferences:', error)
      throw error
    }
  }

  async updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    try {
      const headers = await this.authHeaders()
      
      // Transform frontend format to backend format
      const backendFormat = {
        emailEnabled: preferences.email,
        pushEnabled: preferences.push,
        inAppEnabled: preferences.inApp,
        preferences: {
          lead_created: preferences.types?.lead_created?.email || preferences.types?.lead_created?.push || preferences.types?.lead_created?.inApp || false,
          lead_qualified: preferences.types?.lead_qualified?.email || preferences.types?.lead_qualified?.push || preferences.types?.lead_qualified?.inApp || false,
          conversation_started: preferences.types?.conversation_started?.email || preferences.types?.conversation_started?.push || preferences.types?.conversation_started?.inApp || false,
          system_announcement: preferences.types?.system_announcement?.email || preferences.types?.system_announcement?.push || preferences.types?.system_announcement?.inApp || false,
          marketing: preferences.types?.marketing?.email || preferences.types?.marketing?.push || preferences.types?.marketing?.inApp || false
        }
      }
      
      const response = await fetch(
        `${this.baseUrl}/api/notifications/preferences`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(backendFormat)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Return the same preferences that were sent (already in frontend format)
      this.emit('preferences-updated', preferences)
      return preferences
    } catch (error) {
      console.error('[NotificationService] Failed to update preferences:', error)
      throw error
    }
  }

  async getStats(): Promise<NotificationStats> {
    try {
      const headers = await this.authHeaders()
      const response = await fetch(
        `${this.baseUrl}/api/notifications/stats`,
        { headers }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data?.stats || data.stats
    } catch (error) {
      console.error('[NotificationService] Failed to fetch stats:', error)
      throw error
    }
  }

  async createTestNotification(
    type: NotificationData['type'],
    title: string,
    message: string,
    priority: NotificationData['priority'] = 'medium',
    data?: Record<string, any>
  ): Promise<NotificationData> {
    try {
      const headers = await this.authHeaders()
      const response = await fetch(
        `${this.baseUrl}/api/notifications`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, title, message, priority, data })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to create notification: ${response.statusText}`)
      }

      const responseData = await response.json()
      
      // Clear notification cache after creating new notification
      this.clearCache()
      
      return responseData.data?.notification || responseData.notification
    } catch (error) {
      console.error('[NotificationService] Failed to create notification:', error)
      throw error
    }
  }

  // Clear notification cache
  clearCache() {
    notificationDataCache.clear()
    notificationRequestCache.clear()
    console.log('[NotificationService] Cleared notification cache')
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
export default notificationService