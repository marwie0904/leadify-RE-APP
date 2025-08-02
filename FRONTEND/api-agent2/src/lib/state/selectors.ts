import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { UIStore } from '@/src/stores/ui-store'
import { UserPreferencesStore } from '@/src/stores/user-preferences-store'
import { NotificationStore } from '@/src/stores/notification-store'

// Reusable selectors for UI store
export const uiSelectors = {
  // Sidebar selectors
  isSidebarOpen: (state: UIStore) => state.sidebarOpen,
  isSidebarCollapsed: (state: UIStore) => state.sidebarCollapsed,
  
  // Modal selectors
  isModalOpen: (modalName: keyof UIStore['modals']) => (state: UIStore) => 
    state.modals[modalName] !== false && state.modals[modalName] !== null,
  
  getOpenModal: (state: UIStore) => {
    const openModal = Object.entries(state.modals).find(
      ([_, value]) => value !== false && value !== null
    )
    return openModal ? openModal[0] : null
  },
  
  // Theme selectors
  isDarkMode: (state: UIStore) => {
    if (state.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return state.theme === 'dark'
  },
  
  // Loading selectors
  isGlobalLoading: (state: UIStore) => state.globalLoading,
  loadingMessage: (state: UIStore) => state.loadingMessage,
}

// Reusable selectors for user preferences
export const preferencesSelectors = {
  // Display selectors
  getDateFormat: (state: UserPreferencesStore) => state.dateFormat,
  getTimeFormat: (state: UserPreferencesStore) => state.timeFormat,
  getCurrency: (state: UserPreferencesStore) => state.currency,
  
  // Notification selectors
  areNotificationsEnabled: (state: UserPreferencesStore) => 
    state.emailNotifications || state.pushNotifications,
  
  // Table selectors
  getTableColumns: (tableName: string) => (state: UserPreferencesStore) =>
    state.tableColumns[tableName] || [],
  
  // Feature flag selectors
  isBetaEnabled: (state: UserPreferencesStore) => state.betaFeatures,
  isDebugEnabled: (state: UserPreferencesStore) => state.debugMode,
}

// Reusable selectors for notifications
export const notificationSelectors = {
  // Get notifications by type
  getNotificationsByType: (type: NotificationStore['notifications'][0]['type']) => 
    (state: NotificationStore) => 
      state.notifications.filter((n) => n.type === type),
  
  // Get unread notifications (less than 5 seconds old)
  getUnreadNotifications: (state: NotificationStore) =>
    state.notifications.filter(
      (n) => Date.now() - n.createdAt.getTime() < 5000
    ),
  
  // Check if there are errors
  hasErrors: (state: NotificationStore) =>
    state.notifications.some((n) => n.type === 'error'),
  
  // Get latest notification
  getLatestNotification: (state: NotificationStore) =>
    state.notifications[0] || null,
}

// Computed selectors that combine multiple stores
export function createComputedSelectors<T extends Record<string, any>>(
  stores: T
) {
  return {
    // Check if app is in loading state
    isAppLoading: () => {
      const uiLoading = stores.ui?.getState().globalLoading
      // Add other loading states as needed
      return uiLoading
    },
    
    // Get all user settings
    getUserSettings: () => {
      const preferences = stores.preferences?.getState()
      const uiSettings = {
        theme: stores.ui?.getState().theme,
        sidebarCollapsed: stores.ui?.getState().sidebarCollapsed,
      }
      
      return {
        ...preferences,
        ...uiSettings,
      }
    },
    
    // Check if user has unsaved changes
    hasUnsavedChanges: () => {
      // This would check various stores for dirty states
      return false
    },
  }
}

// Selector hooks with performance optimization
export function createSelectorHook<T, R>(
  useStore: () => T,
  selector: (state: T) => R
) {
  return () => {
    const store = useStore()
    return selector(store)
  }
}

// Memoized selector creator
export function createMemoizedSelector<T, Args extends any[], R>(
  selector: (state: T, ...args: Args) => R
) {
  const cache = new Map<string, R>()
  
  return (state: T, ...args: Args): R => {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = selector(state, ...args)
    cache.set(key, result)
    
    // Clear cache if it gets too large
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    return result
  }
}

// Subscribe to specific state slices
export function createSliceSubscriber<T, S>(
  store: StoreApi<T>,
  selector: (state: T) => S,
  callback: (slice: S, prevSlice: S) => void
) {
  let prevSlice = selector(store.getState())
  
  return store.subscribe((state) => {
    const nextSlice = selector(state)
    if (nextSlice !== prevSlice) {
      callback(nextSlice, prevSlice)
      prevSlice = nextSlice
    }
  })
}

// Combine multiple selectors
export function combineSelectors<T, R extends Record<string, any>>(
  selectors: { [K in keyof R]: (state: T) => R[K] }
) {
  return (state: T): R => {
    const result = {} as R
    
    for (const key in selectors) {
      result[key] = selectors[key](state)
    }
    
    return result
  }
}