import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface UserPreferences {
  // Display preferences
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
  currency: string
  language: string
  
  // Dashboard preferences
  dashboardLayout: 'default' | 'compact' | 'expanded'
  defaultTab: string
  chartType: 'line' | 'bar' | 'area'
  
  // Notification preferences
  emailNotifications: boolean
  pushNotifications: boolean
  soundEnabled: boolean
  
  // Table preferences
  itemsPerPage: number
  tableColumns: Record<string, string[]> // table name -> visible columns
  
  // Feature flags
  betaFeatures: boolean
  debugMode: boolean
}

export interface UserPreferencesActions {
  // Update preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  
  // Display actions
  setDateFormat: (format: UserPreferences['dateFormat']) => void
  setTimeFormat: (format: UserPreferences['timeFormat']) => void
  setCurrency: (currency: string) => void
  setLanguage: (language: string) => void
  
  // Dashboard actions
  setDashboardLayout: (layout: UserPreferences['dashboardLayout']) => void
  setDefaultTab: (tab: string) => void
  setChartType: (type: UserPreferences['chartType']) => void
  
  // Notification actions
  toggleEmailNotifications: () => void
  togglePushNotifications: () => void
  toggleSound: () => void
  
  // Table actions
  setItemsPerPage: (count: number) => void
  setTableColumns: (table: string, columns: string[]) => void
  
  // Feature flags
  toggleBetaFeatures: () => void
  toggleDebugMode: () => void
  
  // Reset
  resetPreferences: () => void
}

export type UserPreferencesStore = UserPreferences & UserPreferencesActions

const defaultPreferences: UserPreferences = {
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  language: 'en',
  dashboardLayout: 'default',
  defaultTab: 'overview',
  chartType: 'line',
  emailNotifications: true,
  pushNotifications: true,
  soundEnabled: true,
  itemsPerPage: 10,
  tableColumns: {},
  betaFeatures: false,
  debugMode: false,
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...defaultPreferences,
        
        // Update preferences
        updatePreferences: (preferences) =>
          set((state) => {
            Object.assign(state, preferences)
          }),
        
        // Display actions
        setDateFormat: (format) =>
          set((state) => {
            state.dateFormat = format
          }),
        
        setTimeFormat: (format) =>
          set((state) => {
            state.timeFormat = format
          }),
        
        setCurrency: (currency) =>
          set((state) => {
            state.currency = currency
          }),
        
        setLanguage: (language) =>
          set((state) => {
            state.language = language
          }),
        
        // Dashboard actions
        setDashboardLayout: (layout) =>
          set((state) => {
            state.dashboardLayout = layout
          }),
        
        setDefaultTab: (tab) =>
          set((state) => {
            state.defaultTab = tab
          }),
        
        setChartType: (type) =>
          set((state) => {
            state.chartType = type
          }),
        
        // Notification actions
        toggleEmailNotifications: () =>
          set((state) => {
            state.emailNotifications = !state.emailNotifications
          }),
        
        togglePushNotifications: () =>
          set((state) => {
            state.pushNotifications = !state.pushNotifications
          }),
        
        toggleSound: () =>
          set((state) => {
            state.soundEnabled = !state.soundEnabled
          }),
        
        // Table actions
        setItemsPerPage: (count) =>
          set((state) => {
            state.itemsPerPage = count
          }),
        
        setTableColumns: (table, columns) =>
          set((state) => {
            state.tableColumns[table] = columns
          }),
        
        // Feature flags
        toggleBetaFeatures: () =>
          set((state) => {
            state.betaFeatures = !state.betaFeatures
          }),
        
        toggleDebugMode: () =>
          set((state) => {
            state.debugMode = !state.debugMode
          }),
        
        // Reset
        resetPreferences: () =>
          set(() => defaultPreferences),
      })),
      {
        name: 'user-preferences-store',
      }
    ),
    {
      name: 'UserPreferencesStore',
    }
  )
)