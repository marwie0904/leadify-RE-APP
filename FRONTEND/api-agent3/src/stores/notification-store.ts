import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number // in milliseconds, null for persistent
  action?: {
    label: string
    onClick: () => void
  }
  createdAt: Date
}

export interface NotificationState {
  notifications: Notification[]
  maxNotifications: number
}

export interface NotificationActions {
  // Add notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string
  success: (title: string, message?: string, duration?: number) => string
  error: (title: string, message?: string, duration?: number) => string
  warning: (title: string, message?: string, duration?: number) => string
  info: (title: string, message?: string, duration?: number) => string
  
  // Remove notifications
  removeNotification: (id: string) => void
  clearAll: () => void
  clearByType: (type: NotificationType) => void
  
  // Update notifications
  updateNotification: (id: string, updates: Partial<Notification>) => void
}

export type NotificationStore = NotificationState & NotificationActions

const initialState: NotificationState = {
  notifications: [],
  maxNotifications: 5,
}

// Helper to generate unique IDs
const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // Add notifications
      addNotification: (notification) => {
        const id = generateId()
        const newNotification: Notification = {
          ...notification,
          id,
          createdAt: new Date(),
        }
        
        set((state) => {
          state.notifications.unshift(newNotification)
          
          // Keep only the latest maxNotifications
          if (state.notifications.length > state.maxNotifications) {
            state.notifications = state.notifications.slice(0, state.maxNotifications)
          }
        })
        
        // Auto-remove after duration if specified
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id)
          }, notification.duration)
        }
        
        return id
      },
      
      success: (title, message, duration = 5000) =>
        get().addNotification({ type: 'success', title, message, duration }),
      
      error: (title, message, duration = null) =>
        get().addNotification({ type: 'error', title, message, duration }),
      
      warning: (title, message, duration = 7000) =>
        get().addNotification({ type: 'warning', title, message, duration }),
      
      info: (title, message, duration = 5000) =>
        get().addNotification({ type: 'info', title, message, duration }),
      
      // Remove notifications
      removeNotification: (id) =>
        set((state) => {
          state.notifications = state.notifications.filter((n) => n.id !== id)
        }),
      
      clearAll: () =>
        set((state) => {
          state.notifications = []
        }),
      
      clearByType: (type) =>
        set((state) => {
          state.notifications = state.notifications.filter((n) => n.type !== type)
        }),
      
      // Update notifications
      updateNotification: (id, updates) =>
        set((state) => {
          const index = state.notifications.findIndex((n) => n.id === id)
          if (index !== -1) {
            Object.assign(state.notifications[index], updates)
          }
        }),
    })),
    {
      name: 'NotificationStore',
    }
  )
)

// Hook to integrate with toast library (sonner)
export function useNotificationToast() {
  const { notifications, removeNotification } = useNotificationStore()
  
  // This can be used to sync with sonner toast library
  return {
    notifications,
    dismiss: removeNotification,
  }
}