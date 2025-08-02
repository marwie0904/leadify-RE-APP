import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface UIState {
  // Sidebar state
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Modal states
  modals: {
    createAgent: boolean
    editProfile: boolean
    inviteMember: boolean
    leadDetails: string | null // lead ID or null
  }
  
  // Theme
  theme: 'light' | 'dark' | 'system'
  
  // Loading states
  globalLoading: boolean
  loadingMessage: string | null
}

export interface UIActions {
  // Sidebar actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Modal actions
  openModal: (modal: keyof UIState['modals'], value?: string | boolean) => void
  closeModal: (modal: keyof UIState['modals']) => void
  closeAllModals: () => void
  
  // Theme actions
  setTheme: (theme: UIState['theme']) => void
  
  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void
}

export type UIStore = UIState & UIActions

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  modals: {
    createAgent: false,
    editProfile: false,
    inviteMember: false,
    leadDetails: null,
  },
  theme: 'system',
  globalLoading: false,
  loadingMessage: null,
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,
        
        // Sidebar actions
        toggleSidebar: () =>
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen
          }),
        
        setSidebarOpen: (open) =>
          set((state) => {
            state.sidebarOpen = open
          }),
        
        setSidebarCollapsed: (collapsed) =>
          set((state) => {
            state.sidebarCollapsed = collapsed
          }),
        
        // Modal actions
        openModal: (modal, value = true) =>
          set((state) => {
            if (typeof value === 'string') {
              (state.modals as any)[modal] = value
            } else {
              (state.modals as any)[modal] = value
            }
          }),
        
        closeModal: (modal) =>
          set((state) => {
            if (typeof state.modals[modal] === 'string') {
              (state.modals as any)[modal] = null
            } else {
              (state.modals as any)[modal] = false
            }
          }),
        
        closeAllModals: () =>
          set((state) => {
            Object.keys(state.modals).forEach((key) => {
              const modalKey = key as keyof UIState['modals']
              if (typeof state.modals[modalKey] === 'string') {
                (state.modals as any)[modalKey] = null
              } else {
                (state.modals as any)[modalKey] = false
              }
            })
          }),
        
        // Theme actions
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme
          }),
        
        // Loading actions
        setGlobalLoading: (loading, message = null) =>
          set((state) => {
            state.globalLoading = loading
            state.loadingMessage = message || null
          }),
      })),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    {
      name: 'UIStore',
    }
  )
)