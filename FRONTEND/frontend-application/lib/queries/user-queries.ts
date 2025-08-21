import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from "@/contexts/simple-auth-context"
import type { User } from '@/lib/validation/schemas'

export const userKeys = {
  all: ['users'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
}

export function useUserProfile() {
  const { getAuthHeaders } = useAuth()

  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      const headers = await getAuthHeaders()
      return api.getProfile(headers)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}