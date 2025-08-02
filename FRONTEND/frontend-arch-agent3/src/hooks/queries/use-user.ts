import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { queryFn, queryKeys, buildQueryOptions } from '@/src/lib/react-query/utils'
import { User } from '@/src/lib/react-query/types'

// Fetch current user profile
export function useUser() {
  const { user: authUser, getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: async () => {
      if (!authUser) throw new Error('No authenticated user')
      
      const headers = await getAuthHeaders()
      return queryFn<User>('/api/users/profile', { headers })
    },
    enabled: !!authUser,
    ...buildQueryOptions<User>({
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),
  })
}

// Fetch user by ID
export function useUserById(userId: string) {
  const { getAuthHeaders } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.userById(userId),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return queryFn<User>(`/api/users/${userId}`, { headers })
    },
    enabled: !!userId,
    ...buildQueryOptions<User>(),
  })
}

// Prefetch user data
export async function prefetchUser(userId: string, queryClient: any) {
  const { getAuthHeaders } = useAuth()
  const headers = await getAuthHeaders()
  
  return queryClient.prefetchQuery({
    queryKey: queryKeys.userById(userId),
    queryFn: () => queryFn<User>(`/api/users/${userId}`, { headers }),
  })
}