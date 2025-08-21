"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/simple-auth-context"
import { usePostHog } from "posthog-js/react"

export function PostHogAuthWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const posthog = usePostHog()

  useEffect(() => {
    if (user && user.id) {
      // Identify the user in PostHog
      posthog?.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0],
        created_at: user.created_at,
      })
      
      // Set user properties for better analytics
      posthog?.setPersonProperties({
        organization_id: user.user_metadata?.organization_id,
        role: user.user_metadata?.role,
      })
    } else if (!user) {
      // Reset PostHog when user logs out
      posthog?.reset()
    }
  }, [user, posthog])

  return <>{children}</>
}