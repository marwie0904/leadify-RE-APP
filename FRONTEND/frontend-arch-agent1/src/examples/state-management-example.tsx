'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Import hooks from our state management system
import { useUser, useUserById } from '@/src/hooks/queries/use-user'
import { useConversations } from '@/src/hooks/queries/use-conversations'
import { useLeads } from '@/src/hooks/queries/use-leads'
import { useUpdateProfile } from '@/src/hooks/mutations/use-update-profile'
import { useCreateLead } from '@/src/hooks/mutations/use-create-lead'

// Import Zustand stores
import { useUIStore } from '@/src/stores/ui-store'
import { useUserPreferencesStore } from '@/src/stores/user-preferences-store'
import { useNotificationStore } from '@/src/stores/notification-store'

// Import selectors
import { uiSelectors, preferencesSelectors } from '@/src/lib/state/selectors'

export function StateManagementExample() {
  // React Query hooks
  const { data: user, isLoading: userLoading } = useUser()
  const { data: conversations } = useConversations({ status: 'active' })
  const { data: leads } = useLeads({ classification: 'Hot' })
  
  // Mutations
  const updateProfile = useUpdateProfile()
  const createLead = useCreateLead()
  
  // Zustand stores - using selectors
  const sidebarOpen = useUIStore(uiSelectors.isSidebarOpen)
  const isDarkMode = useUIStore(uiSelectors.isDarkMode)
  const dateFormat = useUserPreferencesStore(preferencesSelectors.getDateFormat)
  
  // Zustand stores - using actions
  const { toggleSidebar, openModal, setGlobalLoading } = useUIStore()
  const { setDateFormat, toggleBetaFeatures } = useUserPreferencesStore()
  const { success, error, info } = useNotificationStore()
  
  // Example: Optimistic update with mutation
  const handleUpdateProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        name: 'New Name',
        email: 'new@email.com',
      })
    } catch (err) {
      // Error is handled by the mutation's onError
    }
  }
  
  // Example: Create lead with optimistic update
  const handleCreateLead = async () => {
    try {
      await createLead.mutateAsync({
        name: 'John Doe',
        email: 'john@example.com',
        source: 'Website',
        classification: 'Hot',
      })
    } catch (err) {
      // Error is handled by the mutation's onError
    }
  }
  
  // Example: Using notifications
  const showNotifications = () => {
    success('Success!', 'Operation completed successfully')
    error('Error!', 'Something went wrong')
    info('Info', 'This is an informational message')
  }
  
  // Example: Using UI store for modals
  const handleOpenModal = () => {
    openModal('createAgent')
  }
  
  // Example: Real-time updates would be handled automatically via WebSocket
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">State Management Example</h1>
      
      {/* User Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile (React Query)</CardTitle>
        </CardHeader>
        <CardContent>
          {userLoading ? (
            <p>Loading user...</p>
          ) : user ? (
            <div>
              <p>Name: {user.name}</p>
              <p>Email: {user.email}</p>
              <Button onClick={handleUpdateProfile} className="mt-2">
                Update Profile (Optimistic)
              </Button>
            </div>
          ) : (
            <p>No user data</p>
          )}
        </CardContent>
      </Card>
      
      {/* Data Lists Section */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Conversations ({conversations?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {conversations?.slice(0, 3).map((conv) => (
                <li key={conv.id} className="text-sm">
                  {conv.customer_name} - {conv.channel}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Hot Leads ({leads?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {leads?.slice(0, 3).map((lead) => (
                <li key={lead.id} className="text-sm">
                  {lead.name} - {lead.company}
                </li>
              ))}
            </ul>
            <Button onClick={handleCreateLead} className="mt-2">
              Create Lead (Optimistic)
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* UI State Section */}
      <Card>
        <CardHeader>
          <CardTitle>UI State (Zustand)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p>Sidebar: {sidebarOpen ? 'Open' : 'Closed'}</p>
            <p>Theme: {isDarkMode ? 'Dark' : 'Light'}</p>
            <p>Date Format: {dateFormat}</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={toggleSidebar}>Toggle Sidebar</Button>
            <Button onClick={handleOpenModal}>Open Modal</Button>
            <Button onClick={showNotifications}>Show Notifications</Button>
            <Button 
              onClick={() => setDateFormat('DD/MM/YYYY')}
            >
              Change Date Format
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Loading State Example */}
      <Card>
        <CardHeader>
          <CardTitle>Global Loading State</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => {
              setGlobalLoading(true, 'Processing...')
              setTimeout(() => setGlobalLoading(false), 3000)
            }}
          >
            Trigger Global Loading
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}