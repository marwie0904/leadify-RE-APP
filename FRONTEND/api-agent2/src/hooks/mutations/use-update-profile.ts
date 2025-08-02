import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, invalidateQueries } from '@/src/lib/react-query/utils'
import { User } from '@/src/lib/react-query/types'
import { useNotificationStore } from '@/src/stores/notification-store'

interface UpdateProfileData {
  name?: string
  email?: string
  avatar?: string
  preferences?: Record<string, any>
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const headers = await getAuthHeaders()
      return queryFn<User>('/api/users/profile', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    },
    
    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.userProfile() })
      
      // Snapshot the previous value
      const previousUser = queryClient.getQueryData<User>(queryKeys.userProfile())
      
      // Optimistically update to the new value
      if (previousUser) {
        queryClient.setQueryData<User>(queryKeys.userProfile(), {
          ...previousUser,
          ...newData,
          updated_at: new Date().toISOString(),
        })
      }
      
      // Return a context object with the snapshotted value
      return { previousUser }
    },
    
    // If mutation fails, use the context to roll back
    onError: (err, newData, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData<User>(
          queryKeys.userProfile(),
          context.previousUser
        )
      }
      error('Failed to update profile', err.message)
    },
    
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries(invalidateQueries.user())
    },
    
    onSuccess: (data) => {
      success('Profile updated successfully')
    },
  })
}

// Upload avatar mutation
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { getAuthHeaders } = useAuth()
  const { success, error: showError } = useNotificationStore()
  
  return useMutation({
    mutationFn: async (file: File) => {
      const headers = await getAuthHeaders()
      const formData = new FormData()
      formData.append('avatar', file)
      
      return queryFn<{ url: string }>('/api/users/avatar', {
        method: 'POST',
        headers,
        body: formData,
      })
    },
    
    onSuccess: async (data) => {
      // Update the user profile with new avatar URL
      const currentUser = queryClient.getQueryData<User>(queryKeys.userProfile())
      if (currentUser) {
        queryClient.setQueryData<User>(queryKeys.userProfile(), {
          ...currentUser,
          avatar: data.url,
        })
      }
      
      await queryClient.invalidateQueries(invalidateQueries.user())
      success('Avatar uploaded successfully')
    },
    
    onError: (err) => {
      showError('Failed to upload avatar', err.message)
    },
  })
}