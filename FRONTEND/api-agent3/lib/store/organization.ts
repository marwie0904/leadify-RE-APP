import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface OrganizationMember {
  id: string
  name: string
  email: string
  role: "admin" | "moderator" | "agent" | "human_agent"
  status: "active" | "inactive" | "pending"
  joinedAt: string
  lastActive: string
  user_id?: string
  organization_id?: string
}

export interface Organization {
  id: string
  name: string
  domain?: string
  created_at: string
  updated_at: string
}

interface OrganizationState {
  // State
  organization: Organization | null
  members: OrganizationMember[]
  loading: boolean
  error: string | null

  // Actions
  setOrganization: (organization: Organization) => void
  setMembers: (members: OrganizationMember[]) => void
  addMember: (member: OrganizationMember) => void
  updateMember: (id: string, updates: Partial<OrganizationMember>) => void
  removeMember: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  organization: null,
  members: [],
  loading: false,
  error: null,
}

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setOrganization: (organization) =>
          set((state) => ({ ...state, organization })),

        setMembers: (members) =>
          set((state) => ({ ...state, members })),

        addMember: (member) =>
          set((state) => ({ 
            ...state, 
            members: [...state.members, member] 
          })),

        updateMember: (id, updates) =>
          set((state) => ({
            ...state,
            members: state.members.map((member) =>
              member.id === id ? { ...member, ...updates } : member
            ),
          })),

        removeMember: (id) =>
          set((state) => ({
            ...state,
            members: state.members.filter((member) => member.id !== id),
          })),

        setLoading: (loading) =>
          set((state) => ({ ...state, loading })),

        setError: (error) =>
          set((state) => ({ ...state, error })),

        reset: () => set(initialState),
      }),
      {
        name: 'organization-storage',
        partialize: (state) => ({ 
          organization: state.organization,
          members: state.members 
        }),
      }
    )
  )
)